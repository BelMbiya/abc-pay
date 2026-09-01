<?php

namespace App\Services\Payment;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\Learner;
use App\Models\Refund;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Billing\BillingService;
use App\Services\Notification\AdminNotificationService;
use App\Services\Notification\NotificationService;
use App\Services\Payment\Gateways\Contracts\PaymentGateway;
use App\Services\Payment\Gateways\Contracts\TransferRequest;
use App\Services\Payment\Gateways\Exceptions\GatewayException;
use App\Services\Platform\SettingsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Domaine Payment — remboursements (circuit de validation multi-niveaux).
 *
 * Circuit :
 *  - Tuition : l'ÉTABLISSEMENT concerné valide d'abord, puis l'ADMINISTRATEUR acte.
 *    Si l'établissement REFUSE, l'admin ne peut exécuter qu'en FORÇANT (force majeure, justifié).
 *  - Non-Tuition (P2P / service) : validation administrateur seule.
 *
 * L'exécution (admin) : transaction d'origine → « remboursee », mouvement inverse (crédit)
 * créé, réconciliation de l'apprenant inversée, et payeur + back-office notifiés.
 */
class RefundService
{
    public function __construct(
        private readonly NotificationService $notifications,
        private readonly BillingService $billing,
        private readonly SettingsService $settings,
        private readonly PaymentGateway $gateway,
        private readonly ?AdminNotificationService $adminNotify = null,
    ) {}

    /**
     * Crée une demande de remboursement pour une transaction confirmée.
     * `$origin` = qui initie : admin | staff | payer. Une demande initiée par
     * l'ÉTABLISSEMENT vaut validation de premier niveau (il ne se re-valide pas).
     */
    public function request(Transaction $transaction, string $reason, string $by, string $origin = 'admin'): Refund
    {
        if ($transaction->status !== 'confirmee') {
            throw ValidationException::withMessages(['transaction' => 'Seule une transaction confirmée peut être remboursée.']);
        }
        // SÉCURITÉ (M1) : on ne rembourse JAMAIS un remboursement (mouvement de crédit) —
        // sinon boucle de création de monnaie. Seule une opération sortante d'origine est remboursable.
        if ($transaction->type === 'refund' || $transaction->direction === 'credit') {
            throw ValidationException::withMessages(['transaction' => 'Cette opération (crédit / remboursement) n\'est pas remboursable.']);
        }

        // POLITIQUE DE REMBOURSEMENT (bancaire) : consentement établissement + DÉLAI. Au-delà du
        // délai (défaut plateforme, surchargeable par établissement), le remboursement n'est plus possible.
        $establishment = $transaction->establishment_id ? Establishment::find($transaction->establishment_id) : null;
        if ($establishment && $establishment->setting('accept_refunds') === false) {
            throw ValidationException::withMessages(['transaction' => 'Cet établissement n\'accepte pas les demandes de remboursement.']);
        }
        $windowDays = $this->settings->refundWindowDays();
        $override = $establishment?->setting('refund_window_days');
        if (is_int($override) && $override > 0) {
            $windowDays = $override;
        }
        $paidAt = $transaction->confirmed_at ?? $transaction->created_at;
        if ($paidAt !== null && $paidAt->copy()->addDays($windowDays)->isPast()) {
            throw ValidationException::withMessages(['transaction' => "Le délai de remboursement de {$windowDays} jours est dépassé — remboursement impossible."]);
        }

        if (Refund::where('transaction_id', $transaction->id)->whereIn('status', ['demande', 'approuve'])->exists()) {
            throw ValidationException::withMessages(['transaction' => 'Un remboursement est déjà en cours ou effectué pour cette transaction.']);
        }

        $needsEtab = $transaction->type === 'tuition' && $transaction->establishment_id !== null;
        $etabInitiated = $needsEtab && $origin === 'staff';

        $refund = Refund::create([
            'transaction_id' => $transaction->id,
            'establishment_id' => $transaction->establishment_id,
            'amount' => $transaction->amount,
            'currency' => $transaction->currency,
            'reason' => $reason,
            'status' => 'demande',
            'needs_establishment' => $needsEtab,
            // L'établissement à l'origine de la demande → validation de premier niveau acquise.
            'establishment_decision' => $etabInitiated ? 'approuve' : null,
            'establishment_decided_by' => $etabInitiated ? $by : null,
            'establishment_decided_at' => $etabInitiated ? now() : null,
            'requested_by' => $by,
        ]);

        $this->adminNotifySafe('Nouvelle demande de remboursement', $refund->reason, $refund, 'warning');

        // Tuition non initié par l'établissement : il doit valider en premier → on le notifie.
        if ($needsEtab && ! $etabInitiated) {
            $this->notifyEstablishmentStaff($transaction, 'refund', 'warning', 'Remboursement à valider',
                'Une demande de remboursement de '.$this->amountLabel($refund).' attend votre validation.');
        }

        return $refund;
    }

    /**
     * Décision de l'ÉTABLISSEMENT (staff) — étape 1 pour un remboursement Tuition.
     * `$establishmentId` = établissement du staff authentifié (contrôle tenant).
     */
    public function establishmentDecide(Refund $refund, string $decision, string $by, string $establishmentId): Refund
    {
        if (! $refund->needs_establishment || $refund->establishment_id !== $establishmentId) {
            throw ValidationException::withMessages(['refund' => 'Cette demande ne relève pas de votre établissement.']);
        }
        if ($refund->status !== 'demande' || $refund->establishment_decision !== null) {
            throw ValidationException::withMessages(['status' => 'Cette demande a déjà été traitée.']);
        }

        // Transition atomique (H1) : seule la 1re décision passe.
        $affected = Refund::whereKey($refund->id)->where('status', 'demande')->whereNull('establishment_decision')->update([
            'establishment_decision' => $decision === 'approuve' ? 'approuve' : 'refuse',
            'establishment_decided_by' => $by,
            'establishment_decided_at' => now(),
        ]);
        if ($affected === 0) {
            throw ValidationException::withMessages(['status' => 'Cette demande a déjà été traitée.']);
        }
        $refund->refresh();

        $this->adminNotifySafe(
            $decision === 'approuve' ? 'Établissement : remboursement validé' : 'Établissement : remboursement refusé',
            $decision === 'approuve'
                ? 'En attente de la validation finale de l\'administrateur.'
                : 'Refusé par l\'établissement — seul un forçage (force majeure) permet de l\'exécuter.',
            $refund,
            $decision === 'approuve' ? 'info' : 'warning',
        );

        return $refund->refresh();
    }

    /**
     * Décision FINALE de l'ADMINISTRATEUR (approuve|rejete). Pour un remboursement Tuition,
     * l'approbation exige la validation préalable de l'établissement — sauf FORÇAGE justifié
     * (force majeure), utilisable notamment lorsque l'établissement a refusé.
     */
    public function adminDecide(Refund $refund, string $decision, string $by, ?string $note = null, bool $force = false): Refund
    {
        if ($refund->status !== 'demande') {
            throw ValidationException::withMessages(['status' => 'Cette demande a déjà été traitée.']);
        }

        if ($decision === 'approuve' && $refund->needs_establishment) {
            $etab = $refund->establishment_decision;
            if ($etab !== 'approuve' && ! $force) {
                $msg = $etab === 'refuse'
                    ? 'L\'établissement a refusé ce remboursement. Seul un forçage pour force majeure permet de l\'exécuter.'
                    : 'En attente de la validation de l\'établissement concerné.';
                throw ValidationException::withMessages(['decision' => $msg]);
            }
            if ($etab !== 'approuve' && $force && ! trim((string) $note)) {
                throw ValidationException::withMessages(['note' => 'Un motif de force majeure est requis pour forcer ce remboursement.']);
            }
        }

        return DB::transaction(function () use ($refund, $decision, $by, $note, $force) {
            $forced = $decision === 'approuve' && $refund->needs_establishment && $refund->establishment_decision !== 'approuve' && $force;

            // SÉCURITÉ (H1) : transition ATOMIQUE et conditionnelle. Sous requêtes concurrentes
            // (double-clic, retry), une seule UPDATE affecte la ligne encore « demande » ; les
            // autres voient 0 ligne affectée → l'exécution (crédit + réconciliation) ne tourne qu'UNE fois.
            $affected = Refund::whereKey($refund->id)->where('status', 'demande')->update([
                'status' => $decision === 'approuve' ? 'approuve' : 'rejete',
                'decided_by' => $by,
                'decision_note' => $note,
                'decided_at' => now(),
                'forced' => $forced,
                'force_reason' => $forced ? $note : null,
            ]);
            if ($affected === 0) {
                throw ValidationException::withMessages(['status' => 'Cette demande a déjà été traitée.']);
            }
            $refund->refresh();

            if ($decision === 'approuve') {
                $this->execute($refund);
            } else {
                $this->adminNotifySafe('Remboursement rejeté', $note ?: $refund->reason, $refund, 'info');
            }

            return $refund;
        });
    }

    /** Exécute le remboursement approuvé (mouvement inverse + réconciliation + notifications). */
    private function execute(Refund $refund): void
    {
        /** @var Transaction|null $tx */
        $tx = Transaction::with('establishment')->find($refund->transaction_id);
        if (! $tx) {
            return;
        }

        $tx->update(['status' => 'remboursee']);
        $amountLabel = $this->amountLabel($refund);
        $estName = $tx->establishment?->name;

        // 1) Mouvement INVERSE (crédit) — apparaît dans l'historique comme une opération réelle.
        $credit = Transaction::create([
            'type' => 'refund',
            'direction' => 'credit',
            'establishment_id' => $tx->establishment_id,
            'user_id' => $tx->user_id,
            'learner_id' => $tx->learner_id,
            'student_name' => $tx->student_name,
            'student_matricule' => $tx->student_matricule,
            'payer_name' => $tx->payer_name,
            'payer_phone' => $tx->payer_phone,
            'counterparty_name' => $estName,
            'label' => 'Remboursement — '.($tx->reference ?: substr($tx->id, 0, 8)).($refund->forced ? ' (forcé)' : ''),
            'fee_type' => $tx->fee_type,
            'channel' => $tx->channel,
            'amount' => $refund->amount,
            'service_fee' => 0,
            'commission' => 0,
            'total' => $refund->amount,
            'currency' => $tx->currency,
            'status' => 'confirmee',
            'reference' => $tx->reference,
            'confirmed_at' => now(),
        ]);

        // 2) Réconciliation : réinscrit le montant comme dû (le solde de l'apprenant remonte).
        if ($tx->learner_id && $tx->establishment && $tx->establishment->managesFees()) {
            $learner = Learner::find($tx->learner_id);
            if ($learner) {
                $this->billing->reversePayment($learner, (float) $refund->amount);
            }
        }

        // 2b) DÉCAISSEMENT RÉEL au payeur (renvoi Mobile Money) si la passerelle active le
        // permet ET qu'on a un numéro cible. Sinon : acte comptable seul (mouvement hors-bande).
        // Un refus lève (rollback complet) → jamais « remboursé » sans que l'argent parte.
        $this->disburseToPayer($tx, $credit, $refund);

        // 3) Notifie le PAYEUR (espace user).
        if ($tx->user_id) {
            $this->notifications->notify(
                $tx->user_id, 'refund', 'success', 'Remboursement effectué',
                'Remboursement de '.$amountLabel.($estName ? ' — '.$estName : '').' effectué sur votre compte.',
                ['amount' => (float) $refund->amount, 'currency' => $tx->currency, 'establishment' => $estName, 'transaction_id' => $tx->id],
            );
        }

        // 4) Notifie le BACK-OFFICE établissement (espace staff).
        $this->notifyEstablishmentStaff($tx, 'refund', 'info', 'Remboursement émis',
            $amountLabel.' remboursé'.($tx->student_name ? ' — '.$tx->student_name : '').'. Le solde de réconciliation a été réajusté.');

        $this->adminNotifySafe('Remboursement approuvé et exécuté'.($refund->forced ? ' (forcé)' : ''),
            'Transaction '.$tx->id.' remboursée ('.$amountLabel.').', $refund, 'info');
    }

    /**
     * Renvoie RÉELLEMENT l'argent au payeur via la passerelle active (CinetPay `/transfer`
     * ou Araka `/sendmobilemoney`), si le décaissement est activé et qu'un numéro cible existe.
     * L'id du transfert est mémorisé sur le mouvement crédit (`gateway_ref`). En l'absence de
     * décaissement auto (ou de numéro), on retombe sur l'acte comptable seul (mouvement
     * hors-bande) — sans bloquer le remboursement.
     *
     * @throws ValidationException  si la passerelle refuse (message lisible → rollback complet)
     */
    private function disburseToPayer(Transaction $tx, Transaction $credit, Refund $refund): void
    {
        if (! $this->gateway->payoutEnabled()) {
            return; // décaissement auto OFF → acte comptable seul (comme avant)
        }

        // Numéro du payeur : celui de la transaction, sinon le profil de l'utilisateur payeur.
        $payerPhone = $tx->payer_phone ?: ($tx->user_id ? optional(User::find($tx->user_id))->phone : null);
        if (! $payerPhone) {
            // Décaissement activé mais aucune cible : on ne bloque pas (acte comptable),
            // mais on alerte l'admin qu'un renvoi manuel est nécessaire.
            $this->adminNotifySafe('Remboursement à décaisser manuellement',
                'Aucun numéro Mobile Money pour le payeur — renvoi de '.$this->amountLabel($refund).' à effectuer hors-bande.',
                $refund, 'warning');

            return;
        }

        try {
            $transfer = $this->gateway->sendTransfer(new TransferRequest(
                reference: $credit->id,
                amount: (float) $refund->amount,
                currency: $tx->currency,
                channel: $tx->channel,                       // canal abc pay → mappé par la passerelle
                phone: $payerPhone,
                beneficiaryName: $tx->payer_name ?: 'Payeur abc pay',
                reason: 'Remboursement abc pay',
            ));
        } catch (GatewayException $e) {
            // Message déjà lisible → 422 + rollback (le remboursement n'est PAS acté).
            throw ValidationException::withMessages(['refund' => 'Remboursement refusé par la passerelle : '.$e->getMessage()]);
        }

        // Trace le transfert sur le mouvement crédit (Success = décaissé ; Pending = webhook).
        $credit->forceFill([
            'gateway' => $this->gateway->name(),
            'gateway_ref' => $transfer->providerRef,
            'notify_token' => $transfer->notifyToken,
        ])->save();
    }

    /** Demandes visibles par un établissement (celles qui le concernent). */
    public function listForEstablishment(string $establishmentId, int $limit = 200): array
    {
        return $this->mapList(
            Refund::query()->where('establishment_id', $establishmentId)->where('needs_establishment', true)->latest()->limit($limit)->get(),
        );
    }

    /** @return array<int, array<string, mixed>> */
    public function list(?string $status = null, int $limit = 200): array
    {
        $q = Refund::query()->with('transaction:id,reference')->latest()->limit($limit);
        if ($status) {
            $q->where('status', $status);
        }

        return $this->mapList($q->get());
    }

    /** @param  \Illuminate\Support\Collection<int, Refund>  $refunds */
    private function mapList($refunds): array
    {
        return $refunds->map(fn (Refund $r) => [
            'id' => $r->id,
            'transaction_id' => $r->transaction_id,
            'amount' => (float) $r->amount,
            'currency' => $r->currency,
            'reason' => $r->reason,
            'status' => $r->status,
            'needs_establishment' => (bool) $r->needs_establishment,
            'establishment_decision' => $r->establishment_decision,
            'establishment_decided_by' => $r->establishment_decided_by,
            'establishment_decided_at' => $r->establishment_decided_at?->toIso8601String(),
            'requested_by' => $r->requested_by,
            'decided_by' => $r->decided_by,
            'decision_note' => $r->decision_note,
            'decided_at' => $r->decided_at?->toIso8601String(),
            'forced' => (bool) $r->forced,
            'force_reason' => $r->force_reason,
            'created_at' => $r->created_at?->toIso8601String(),
            'transaction_reference' => $r->relationLoaded('transaction') ? $r->transaction?->reference : null,
        ])->all();
    }

    private function amountLabel(Refund $refund): string
    {
        $sym = $refund->currency === 'CDF' ? 'FC' : '$';

        return number_format((float) $refund->amount, 2, ',', ' ').' '.$sym;
    }

    private function notifyEstablishmentStaff(Transaction $tx, string $type, string $level, string $title, string $body): void
    {
        if (! $tx->establishment_id) {
            return;
        }
        $staffIds = EstablishmentStaff::where('establishment_id', $tx->establishment_id)
            ->pluck('user_id')->unique()->reject(fn ($id) => $id === $tx->user_id)->all();
        foreach ($staffIds as $sid) {
            $this->notifications->notify($sid, $type, $level, $title, $body,
                ['transaction_id' => $tx->id, 'student' => $tx->student_name, 'currency' => $tx->currency]);
        }
    }

    private function adminNotifySafe(string $title, ?string $body, Refund $refund, string $level): void
    {
        try {
            $this->adminNotify?->push(type: 'refund', level: $level, title: $title, body: $body,
                meta: ['refund_id' => $refund->id, 'transaction_id' => $refund->transaction_id]);
        } catch (\Throwable) {
            // best-effort
        }
    }
}
