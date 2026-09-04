<?php

namespace App\Services\Payment;

use App\Models\Establishment;
use App\Models\Learner;
use App\Models\Transaction;
use App\Services\Billing\BillingService;
use App\Services\Document\ReceiptService;
use App\Services\Fraud\FraudService;
use App\Services\Payment\Gateways\Contracts\PaymentGateway;
use App\Services\Payment\Gateways\Contracts\PaymentRequest;
use App\Services\Payment\Gateways\Contracts\PaymentState;
use App\Services\Payment\Gateways\Exceptions\GatewayException;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Domaine Payment — logique métier du paiement Tuition.
 * Sortie des contrôleurs (DDD) : calcul des frais/commission, création de la
 * transaction, idempotence, émission du reçu. Le contrôleur ne fait qu'orchestrer.
 */
class TuitionPaymentService
{
    /**
     * Message payeur UNIQUE pour tout établissement non encaissable (suspendu,
     * en cours de vérification, sans barème). Volontairement générique : il ne
     * révèle pas l'état interne d'un établissement à un appelant anonyme
     * (anti-énumération). Le détail reste connu de l'établissement dans son espace.
     */
    private const NOT_RECEIVABLE = "Cet établissement ne peut pas recevoir de paiements pour le moment.";

    public function __construct(
        private readonly ReceiptService $receipts,
        private readonly BillingService $billing,
        private readonly FraudService $fraud,
        private readonly PaymentGateway $gateway,
    ) {}

    /**
     * Garde d'encaissement (autoritaire) : un établissement doit être ACTIF et
     * VÉRIFIÉ pour recevoir des paiements — même par appel direct avec son id
     * (l'annuaire ne suffit pas comme barrière). Message neutre (anti-énumération).
     * Publique : appelée aussi par le contrôleur pour gater le devis (F3/F4).
     */
    public function assertReceivable(Establishment $establishment): void
    {
        // Actif + identité vérifiée + KYB complet (si exigé).
        if (! $establishment->canReceivePayments()) {
            throw ValidationException::withMessages(['establishment_id' => self::NOT_RECEIVABLE]);
        }
    }

    /** Taux de commission de l'établissement (prélevée sur son reversement). */
    public function commissionRate(Establishment $establishment): float
    {
        return (float) $establishment->commission_rate;
    }

    /**
     * Devis (recalculé côté serveur).
     * RÈGLE : les frais (commission abc pay) sont À LA CHARGE DU PAYEUR — il paie
     * `montant + frais`. L'ÉTABLISSEMENT reçoit le MONTANT PLEIN, net et exact, sans
     * aucune déduction au reversement.
     */
    public function quote(Establishment $establishment, float $amount): array
    {
        $amount = round($amount, 2);
        $rate = $this->commissionRate($establishment);
        $commission = round($amount * $rate, 2);

        return [
            'amount' => $amount,
            'service_fee' => $commission,                 // frais À LA CHARGE DU PAYEUR
            'total' => round($amount + $commission, 2),   // total dû par le payeur = montant + frais
            'commission_rate' => $rate,
            'commission' => $commission,                  // revenu abc pay (= frais payeur)
            'net_establishment' => $amount,               // l'établissement reçoit le montant PLEIN
        ];
    }

    /**
     * Crée un paiement Tuition (idempotent) et émet le reçu.
     *
     * @param  array<string, mixed>  $data  charge validée (TuitionPaymentRequest)
     * @param  int|null  $userId  payeur authentifié (facultatif : tiers non connecté possible)
     */
    public function create(Establishment $establishment, array $data, ?string $idempotencyKey = null, ?int $userId = null): array
    {
        // Actif + vérifié (suspendu / en cours de vérification → refus, même en appel direct).
        $this->assertReceivable($establishment);

        // Plafond : on ne peut jamais payer PLUS que le frais SÉLECTIONNÉ (recalcul serveur).
        $this->assertAmountWithinFees($establishment, (float) $data['amount'], $data['fee_type'] ?? null);

        // Idempotence : même clé → on renvoie la transaction déjà créée (anti double débit).
        if ($idempotencyKey) {
            // SÉCURITÉ : idempotence scopée au contexte (établissement + payeur) — empêche
            // qu'un tiers rejouant une clé reçoive le reçu/qr_token d'un autre paiement.
            $existing = Transaction::with('receipt')
                ->where('idempotency_key', $idempotencyKey)
                ->where('establishment_id', $establishment->id)
                ->when($userId, fn ($q) => $q->where('user_id', $userId), fn ($q) => $q->whereNull('user_id'))
                ->first();
            if ($existing) {
                // Rejeu : on ne re-livre le qr_token (secret) que si le payeur est identifié.
                return $this->present($existing, $userId !== null);
            }
        }

        return DB::transaction(function () use ($establishment, $data, $idempotencyKey, $userId) {
            $amount = round((float) $data['amount'], 2);
            $commission = round($amount * (float) $establishment->commission_rate, 2);
            $serviceFee = $commission;            // frais À LA CHARGE DU PAYEUR
            $total = round($amount + $serviceFee, 2); // le payeur paie montant + frais

            $matricule = $data['student_matricule'];

            // Réconciliation par matricule : apprenant DÉJÀ inscrit (registre) ?
            // (uniquement si l'établissement gère les frais dans abc pay).
            $registered = $establishment->managesFees()
                ? $establishment->learners()->where('source', 'registre')->where('matricule', $matricule)->first()
                : null;

            // Sinon, on TRACE l'apprenant concerné (source = paiement), clé = matricule.
            $learner = $registered ?? $establishment->learners()->firstOrCreate(
                ['matricule' => $matricule, 'source' => 'paiement'],
                [
                    'abcpay_ref' => 'ABCP-'.Str::upper(Str::random(8)),
                    'last_name' => $data['student_name'],
                    'academic_group' => $data['student_info'] ?? null,
                    'parent_name' => $data['payer_name'] ?? null,
                    'parent_phone' => $data['payer_phone'] ?? null,
                    'parent_relation' => $data['payer_relation'] ?? null,
                    'status' => 'actif',
                ],
            );

            try {
                $transaction = Transaction::create([
                'establishment_id' => $establishment->id,
                'user_id' => $userId,
                'learner_id' => $learner->id,
                'student_name' => $data['student_name'],
                'student_info' => $data['student_info'] ?? null,
                'student_matricule' => $matricule,
                'payer_name' => $data['payer_name'] ?? null,
                'payer_phone' => $data['payer_phone'] ?? null,
                'payer_relation' => $data['payer_relation'] ?? null,
                'fee_type' => $data['fee_type'],
                'channel' => $data['channel'],
                'amount' => $amount,
                'service_fee' => $serviceFee,
                'commission' => $commission,
                'total' => $total, // le payeur paie le montant + les frais
                'currency' => $establishment->currency ?: app(\App\Services\Platform\SettingsService::class)->currency(),
                'status' => 'pending', // confirmé par confirmTransaction (mock) ou le webhook passerelle
                'gateway' => $this->gateway->enabled() ? $this->gateway->name() : null,
                'reference' => $data['reference'] ?? null,
                'idempotency_key' => $idempotencyKey,
                ]);
            } catch (UniqueConstraintViolationException $e) {
                // Course sur la même Idempotency-Key (contrainte UNIQUE) → on renvoie la
                // transaction déjà créée au lieu d'un 500. Scopé au même contexte (anti-fuite).
                $existing = Transaction::with('receipt')
                    ->where('idempotency_key', $idempotencyKey)
                    ->where('establishment_id', $establishment->id)
                    ->when($userId, fn ($q) => $q->where('user_id', $userId), fn ($q) => $q->whereNull('user_id'))
                    ->first();
                if ($existing) {
                    return $this->present($existing, $userId !== null);
                }
                throw $e;
            }

            // SANS passerelle (démo) : confirmation immédiate (comportement historique).
            if (! $this->gateway->enabled()) {
                $this->confirmTransaction($transaction);

                return $this->present($transaction->fresh('receipt'));
            }

            // AVEC passerelle : initialisation de l'encaissement (via l'abstraction). Le
            // statut réel est posé au retour / par le webhook. `redirectUrl` peut être NULL
            // (push direct type Araka) → le front va alors directement au *polling*.
            $merchantRef = 'ABCP'.strtoupper(Str::random(12)); // 16 car. (≤20 Araka, ≤30 CinetPay)
            [$firstName, $lastName] = $this->splitClientName($data['payer_name'] ?? $data['student_name']);
            $statutUrl = config('cinetpay.front_url').'/paiement/statut?tx='.$transaction->id;

            try {
                $init = $this->gateway->initPayment(new PaymentRequest(
                    merchantRef: $merchantRef,
                    amount: (int) round($total),        // le payeur règle le montant + les frais
                    currency: $transaction->currency,   // DOIT = devise du compte passerelle
                    channel: $data['channel'],
                    designation: 'Scolarite - '.$data['fee_type'],
                    clientEmail: $data['payer_email'] ?? 'paiement@abcpay.cd',
                    clientFirstName: $firstName,
                    clientLastName: $lastName,
                    clientPhone: $data['payer_phone'] ?? null,
                    successUrl: $statutUrl,
                    failedUrl: $statutUrl,
                    notifyUrl: config('cinetpay.notify_base').'/api/v1/webhooks/'.$this->gateway->name().'/payment',
                ));
            } catch (GatewayException $e) {
                // Refus passerelle (message déjà lisible) → 422, pas de transaction fantôme.
                throw ValidationException::withMessages(['payment' => $e->getMessage()]);
            }

            $transaction->forceFill([
                'gateway_ref' => $init->reference,
                'payment_token' => $init->paymentToken,
                'notify_token' => $init->notifyToken,
            ])->save();

            return $this->present($transaction) + ['payment_url' => $init->redirectUrl];
        });
    }

    /** Découpe un nom complet en prénom/nom, en garantissant le minimum de 2 caractères exigé par CinetPay. */
    private function splitClientName(?string $full): array
    {
        $parts = preg_split('/\s+/', trim((string) $full), 2, PREG_SPLIT_NO_EMPTY) ?: [];
        $first = $parts[0] ?? '';
        $last = $parts[1] ?? '';

        return [
            mb_strlen($first) >= 2 ? $first : 'Client',
            mb_strlen($last) >= 2 ? $last : 'AbcPay',
        ];
    }

    /**
     * Confirme une transaction (mock immédiat OU depuis le webhook CinetPay) : passe en
     * `confirmee`, émet le reçu, évalue la fraude, IMPUTE le paiement à l'apprenant inscrit,
     * et notifie payeur + staff. IDEMPOTENT : une notification peut arriver plusieurs fois.
     */
    /**
     * Vérifie ACTIVEMENT le statut d'une transaction en attente auprès de CinetPay et
     * la confirme/échoue en conséquence. Sert de fallback au webhook — indispensable en
     * LOCAL (le sandbox CinetPay ne peut pas joindre `localhost`) et robuste en prod.
     */
    public function refreshStatus(Transaction $transaction): Transaction
    {
        if ($transaction->status !== 'pending' || $transaction->gateway !== $this->gateway->name()
            || ! $this->gateway->enabled() || ! $transaction->gateway_ref) {
            return $transaction;
        }

        try {
            // Statut AUTORITAIRE via la passerelle (jamais le corps du webhook). Sert aussi
            // de confirmation en LOCAL quand le webhook ne peut pas joindre la machine.
            $state = $this->gateway->checkPayment($transaction->gateway_ref);
        } catch (\Throwable) {
            return $transaction; // réseau indisponible : on retentera au prochain appel
        }

        if ($state === PaymentState::Success) {
            $this->confirmTransaction($transaction);
        } elseif ($state === PaymentState::Failed) {
            $transaction->forceFill(['status' => 'failed'])->save();
        }

        return $transaction->fresh();
    }

    public function confirmTransaction(Transaction $transaction): void
    {
        if ($transaction->status === 'confirmee') {
            return;
        }

        $transaction->forceFill(['status' => 'confirmee', 'confirmed_at' => now()])->save();

        $this->receipts->issueFor($transaction);
        $this->fraud->flag($transaction);

        $amount = (float) $transaction->amount;
        $establishment = Establishment::find($transaction->establishment_id);
        $learner = $transaction->learner_id ? Learner::find($transaction->learner_id) : null;

        // Imputation : le paiement réduit les postes de l'apprenant INSCRIT (registre).
        if ($learner && $learner->source === 'registre') {
            $this->billing->applyPayment($learner, $amount);
        }

        $sym = ($transaction->currency === 'CDF' ? 'FC' : '$');
        $notifier = app(\App\Services\Notification\NotificationService::class);

        if ($transaction->user_id) {
            $notifier->notify(
                $transaction->user_id, 'tuition', 'success', 'Paiement Tuition réussi',
                'Paiement de '.number_format($amount, 2, ',', ' ').' '.$sym.' à '.($establishment?->name).' effectué.',
                ['amount' => $amount, 'currency' => $transaction->currency, 'establishment' => $establishment?->name],
            );
        }

        $staffIds = ($establishment && $establishment->setting('notify_staff_on_payment') === false) ? []
            : \App\Models\EstablishmentStaff::where('establishment_id', $transaction->establishment_id)
                ->pluck('user_id')->unique()->reject(fn ($id) => $id === $transaction->user_id)->all();
        $receiptNumber = $transaction->fresh('receipt')->receipt?->number;
        foreach ($staffIds as $sid) {
            $notifier->notify(
                $sid, 'tuition', 'success', 'Nouveau paiement encaissé',
                number_format($amount, 2, ',', ' ').' '.$sym.' — '.$transaction->fee_type.' de '.$transaction->student_name.'.',
                ['amount' => $amount, 'currency' => $transaction->currency, 'student' => $transaction->student_name, 'fee_type' => $transaction->fee_type, 'receipt' => $receiptNumber],
            );
        }
    }

    /**
     * Plafond serveur (autoritaire) : le montant ne peut jamais dépasser le frais
     * SÉLECTIONNÉ, tel que défini au BARÈME de l'établissement (`fee_schedules`,
     * via `resolvedBareme()`). Le plafond est le montant du type choisi (repli sur
     * le frais le plus élevé si le type est inconnu). Aucun contournement client ne
     * peut surpayer.
     *
     * RÈGLES MÉTIER :
     *  - Un établissement SANS barème ne peut RIEN encaisser (il doit d'abord en
     *    définir un). On rejette explicitement plutôt que d'ouvrir un plafond infini.
     *  - On ne peut jamais recevoir au-delà de ce que prévoit le barème.
     * (Les apprenants inscrits sont bornés en plus par leur solde dû via le billing.)
     */
    private function assertAmountWithinFees(Establishment $establishment, float $amount, ?string $feeType): void
    {
        $bareme = $establishment->resolvedBareme();
        $fees = $bareme['fees'];
        $presets = $bareme['presets'];

        // Pas de barème → pas d'encaissement possible (message neutre, anti-énumération).
        if ($fees === [] || $presets === []) {
            throw ValidationException::withMessages(['amount' => self::NOT_RECEIVABLE]);
        }

        // Le type de frais DOIT appartenir au barème : sinon on refuse (empêche de
        // payer sous un libellé arbitraire replié sur le plafond le plus élevé — F2).
        $idx = $feeType !== null ? array_search($feeType, $fees, true) : false;
        if ($feeType !== null && $idx === false) {
            throw ValidationException::withMessages([
                'fee_type' => 'Type de frais invalide pour cet établissement.',
            ]);
        }
        $cap = $idx !== false ? $presets[$idx] : max($presets);

        if ($cap > 0 && round($amount, 2) > $cap + 0.001) {
            throw ValidationException::withMessages([
                'amount' => 'Le montant ne peut pas dépasser le frais prévu au barème ('.number_format($cap, 0, ',', ' ').').',
            ]);
        }
    }

    /**
     * Représentation API (DTO de sortie).
     *
     * @param  bool  $withQrToken  Le `qr_token` (secret de vérification du reçu) n'est
     *   renvoyé qu'à la CRÉATION. Sur un rejeu d'idempotence ANONYME, on l'omet : un tiers
     *   qui rejoue une clé devinée/observée ne doit pas récupérer le secret d'un autre reçu
     *   (durcissement F6a). Le numéro de reçu reste renvoyé (non secret).
     */
    private function present(Transaction $transaction, bool $withQrToken = true): array
    {
        return [
            'transaction' => [
                'id' => $transaction->id,
                'amount' => $transaction->amount,
                'service_fee' => $transaction->service_fee, // 0 pour le payeur
                'commission' => $transaction->commission,   // part abc pay (établissement)
                'total' => $transaction->total,
                'status' => $transaction->status,
                'fee_type' => $transaction->fee_type,
                'channel' => $transaction->channel,
            ],
            'receipt' => [
                'number' => $transaction->receipt?->number,
                'qr_token' => $withQrToken ? $transaction->receipt?->qr_token : null,
            ],
        ];
    }
}
