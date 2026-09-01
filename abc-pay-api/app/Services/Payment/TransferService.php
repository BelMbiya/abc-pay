<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Models\User;
use App\Services\Document\ReceiptService;
use App\Services\Fraud\FraudService;
use App\Services\Notification\NotificationService;
use App\Services\Payment\Gateways\Contracts\PaymentGateway;
use App\Services\Payment\Gateways\Contracts\PaymentRequest;
use App\Services\Payment\Gateways\Contracts\PaymentState;
use App\Services\Payment\Gateways\Contracts\TransferRequest;
use App\Services\Payment\Gateways\Exceptions\GatewayException;
use App\Services\Platform\SettingsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Domaine Payment — transactions NON-Tuition du payeur (envoi P2P, paiement de service).
 * Gère le cycle succès/échec, la devise choisie, le mouvement miroir « Reçu » et les
 * notifications instantanées (succès → destinataire ; échec → expéditeur avec la raison).
 */
class TransferService
{
    /** Plafond CUMULÉ journalier = plafond par opération × ce facteur (LBC/FT). */
    private const DAILY_CAP_FACTOR = 3;

    public function __construct(
        private readonly ReceiptService $receipts,
        private readonly NotificationService $notifications,
        private readonly SettingsService $settings,
        private readonly FraudService $fraud,
        private readonly PaymentGateway $gateway,
    ) {}

    /**
     * @param  array<string, mixed>  $data  charge validée (TransactionStoreRequest)
     * @return array<string, mixed>
     */
    public function create(User $user, array $data, ?string $idempotencyKey = null): array
    {
        if ($idempotencyKey) {
            // SÉCURITÉ : idempotence scopée à l'appelant — un tiers rejouant la clé
            // d'autrui ne doit jamais recevoir SON reçu / qr_token (fuite inter-comptes).
            $existing = Transaction::with('receipt')
                ->where('idempotency_key', $idempotencyKey)
                ->where('user_id', $user->id)
                ->first();
            if ($existing) {
                return $this->present($existing);
            }
        }

        $amount = round((float) $data['amount'], 2);
        $currency = $this->resolveCurrency($data);
        $failure = $this->failureReason($user, $data, $amount, $currency);

        return DB::transaction(function () use ($user, $data, $idempotencyKey, $amount, $currency, $failure) {
            // ── Échec métier : on trace la transaction en échec + on notifie l'EXPÉDITEUR ──
            if ($failure !== null) {
                $tx = $this->record($user, $data, $amount, $currency, 'echouee', $idempotencyKey, $failure);
                $this->fraud->flag($tx); // évaluation anti-fraude (échec inclus)
                $this->notifications->notify(
                    $user->id, $data['type'], 'error',
                    'Échec de l\'opération',
                    $this->label($data).' de '.$this->money($amount, $currency).' : '.$failure,
                    ['reason' => $failure, 'amount' => $amount, 'currency' => $currency],
                );

                return $this->present($tx, $failure);
            }

            // ── ENCAISSEMENT RÉEL (passerelle) ──
            //   • « Payer un service » : débite le mobile money du payeur.
            //   • « Envoyer » (P2P) : ENCAISSE d'abord l'EXPÉDITEUR (jambe 1) ; le
            //     DÉCAISSEMENT vers le destinataire (jambe 2) a lieu à la confirmation.
            //   La transaction reste `pending` jusqu'au retour de statut / webhook.
            if ($this->gateway->enabled()) {
                if ($data['type'] === 'service') {
                    return $this->createServiceViaGateway($user, $data, $amount, $currency, $idempotencyKey);
                }
                if ($data['type'] === 'send') {
                    return $this->createSendViaGateway($user, $data, $amount, $currency, $idempotencyKey);
                }
            }

            // ── Succès (mode démo, passerelle OFF) ──
            $tx = $this->record($user, $data, $amount, $currency, 'confirmee', $idempotencyKey);
            $this->fraud->flag($tx); // évaluation anti-fraude
            $this->receipts->issueFor($tx);

            // Notifie l'expéditeur du succès.
            $this->notifications->notify(
                $user->id, $data['type'], 'success',
                $data['type'] === 'send' ? 'Envoi réussi' : 'Paiement réussi',
                $this->label($data).' de '.$this->money($amount, $currency).' effectué.',
                ['amount' => $amount, 'currency' => $currency],
            );

            // Vice-versa : mouvement miroir « Reçu » + notification du DESTINATAIRE (démo).
            if ($data['type'] === 'send') {
                $this->mirrorReceive($tx);
            }

            return $this->present($tx->fresh('receipt'));
        });
    }

    /**
     * Encaissement « Payer un service » via CinetPay : crée la transaction `pending`,
     * initialise le paiement web (opérateur verrouillé sur le canal) et renvoie
     * `payment_url`. Le statut réel est posé au retour (page de statut) ou par le webhook.
     * Sans `payment_url`, on ÉCHOUE clairement (le `DB::transaction` annule la ligne).
     *
     * @return array<string, mixed>
     */
    private function createServiceViaGateway(User $user, array $data, float $amount, string $currency, ?string $idem): array
    {
        $tx = $this->record($user, $data, $amount, $currency, 'pending', $idem);
        $tx->forceFill(['gateway' => $this->gateway->name()])->save();

        $merchantRef = 'ABCS'.strtoupper(Str::random(12)); // 16 car. (≤20 Araka, ≤30 CinetPay)
        [$firstName, $lastName] = $this->splitClientName($user->name);
        $statutUrl = config('cinetpay.front_url').'/paiement/statut?tx='.$tx->id;

        try {
            $init = $this->gateway->initPayment(new PaymentRequest(
                merchantRef: $merchantRef,
                amount: (int) round($amount),
                currency: $currency,
                channel: $data['channel'],
                designation: $this->label($data),
                clientEmail: $user->email ?: 'paiement@abcpay.cd',
                clientFirstName: $firstName,
                clientLastName: $lastName,
                // Numéro Mobile Money du payeur = cible du push direct (Araka). Saisi au
                // formulaire (peut différer du profil), repli sur le numéro du compte.
                clientPhone: ($data['payer_phone'] ?? null) ?: $user->phone,
                successUrl: $statutUrl,
                failedUrl: $statutUrl,
                notifyUrl: config('cinetpay.notify_base').'/api/v1/webhooks/'.$this->gateway->name().'/payment',
            ));
        } catch (GatewayException $e) {
            throw ValidationException::withMessages(['payment' => $e->getMessage()]);
        }

        $tx->forceFill([
            'gateway_ref' => $init->reference,
            'payment_token' => $init->paymentToken,
            'notify_token' => $init->notifyToken,
        ])->save();

        return $this->present($tx) + ['payment_url' => $init->redirectUrl];
    }

    /**
     * ENVOI P2P via passerelle — JAMBE 1 : encaisse l'EXPÉDITEUR (push sur SON Mobile Money).
     * La transaction reste `pending` ; le DÉCAISSEMENT vers le destinataire (jambe 2) a lieu
     * à la confirmation (`confirmSend`). Exige le numéro de l'expéditeur (profil).
     *
     * @return array<string, mixed>
     */
    private function createSendViaGateway(User $user, array $data, float $amount, string $currency, ?string $idem): array
    {
        if (! $user->phone) {
            throw ValidationException::withMessages([
                'payment' => 'Ajoute ton numéro Mobile Money dans « Profil » pour envoyer de l\'argent.',
            ]);
        }

        $tx = $this->record($user, $data, $amount, $currency, 'pending', $idem);
        $tx->forceFill(['gateway' => $this->gateway->name()])->save();

        $merchantRef = 'ABSN'.strtoupper(Str::random(12)); // 16 car. (≤20 Araka, ≤30 CinetPay)
        [$firstName, $lastName] = $this->splitClientName($user->name);
        $statutUrl = config('cinetpay.front_url').'/paiement/statut?tx='.$tx->id;
        $dest = ($data['counterparty_name'] ?? null) ?: ($data['counterparty_phone'] ?? 'un proche');

        try {
            $init = $this->gateway->initPayment(new PaymentRequest(
                merchantRef: $merchantRef,
                amount: (int) round($amount),
                currency: $currency,
                channel: $data['channel'],           // canal de paiement de l'EXPÉDITEUR
                designation: 'Envoi à '.$dest,
                clientEmail: $user->email ?: 'paiement@abcpay.cd',
                clientFirstName: $firstName,
                clientLastName: $lastName,
                clientPhone: $user->phone,           // push sur le Mobile Money de l'EXPÉDITEUR
                successUrl: $statutUrl,
                failedUrl: $statutUrl,
                notifyUrl: config('cinetpay.notify_base').'/api/v1/webhooks/'.$this->gateway->name().'/payment',
            ));
        } catch (GatewayException $e) {
            throw ValidationException::withMessages(['payment' => $e->getMessage()]);
        }

        $tx->forceFill([
            'gateway_ref' => $init->reference,
            'payment_token' => $init->paymentToken,
            'notify_token' => $init->notifyToken,
        ])->save();

        return $this->present($tx) + ['payment_url' => $init->redirectUrl];
    }

    /**
     * Vérifie ACTIVEMENT le statut d'un paiement en attente auprès de la passerelle
     * (fallback webhook, indispensable en local). Confirme ou échoue en conséquence.
     * Dispatch par type : `send` → décaissement au destinataire ; `service` → simple confirm.
     */
    public function refreshStatus(Transaction $transaction): Transaction
    {
        if ($transaction->status !== 'pending' || $transaction->gateway !== $this->gateway->name()
            || ! $this->gateway->enabled() || ! $transaction->gateway_ref) {
            return $transaction;
        }

        try {
            $state = $this->gateway->checkPayment($transaction->gateway_ref);
        } catch (\Throwable) {
            return $transaction; // réseau indisponible : on retentera au prochain appel
        }

        if ($state === PaymentState::Success) {
            $transaction->type === 'send'
                ? $this->confirmSend($transaction)
                : $this->confirmService($transaction);
        } elseif ($state === PaymentState::Failed) {
            $transaction->forceFill(['status' => 'failed'])->save();
        }

        return $transaction->fresh();
    }

    /**
     * ENVOI P2P — JAMBE 2 : l'encaissement de l'expéditeur est confirmé → on DÉCAISSE le
     * destinataire (opérateur déduit de son numéro). Idempotent (claim atomique anti
     * double-décaissement). En cas d'échec du décaissement, l'expéditeur est REMBOURSÉ.
     */
    public function confirmSend(Transaction $tx): void
    {
        // Claim ATOMIQUE : seule la 1re confirmation déclenche le décaissement (anti-rejeu).
        $claimed = Transaction::whereKey($tx->id)->where('status', 'pending')
            ->update(['status' => 'confirmee', 'confirmed_at' => now()]);
        if ($claimed === 0) {
            return;
        }
        $tx->refresh();
        $this->fraud->flag($tx);

        // Décaissement RÉEL vers le destinataire (jambe 2).
        try {
            $transfer = $this->gateway->sendTransfer(new TransferRequest(
                reference: $tx->id,
                amount: (float) $tx->amount,
                currency: $tx->currency,
                channel: $this->recipientChannel($tx->counterparty_phone),
                phone: $tx->counterparty_phone,
                beneficiaryName: $tx->counterparty_name ?: 'Bénéficiaire',
                reason: 'Envoi abc pay',
            ));
        } catch (GatewayException $e) {
            // Encaissé mais NON livré → remboursement automatique de l'expéditeur.
            $this->refundSenderAfterFailedPayout($tx, $e->getMessage());

            return;
        }

        // Livré : reçu, trace du décaissement, notifications, miroir « Reçu ».
        $tx->forceFill(['notify_token' => $transfer->providerRef ?? $tx->notify_token])->save();
        $this->receipts->issueFor($tx);

        if ($tx->user_id) {
            $this->notifications->notify(
                $tx->user_id, 'send', 'success', 'Envoi réussi',
                'Envoi de '.$this->money((float) $tx->amount, $tx->currency).' à '.($tx->counterparty_name ?: $tx->counterparty_phone).' effectué.',
                ['amount' => (float) $tx->amount, 'currency' => $tx->currency, 'to' => $tx->counterparty_phone],
            );
        }

        $this->mirrorReceive($tx);
    }

    /**
     * Décaissement destinataire IMPOSSIBLE après encaissement de l'expéditeur : on RENVOIE
     * l'argent à l'expéditeur (via la passerelle). Si même ce remboursement échoue, on
     * marque `failed` et on notifie (régularisation manuelle). Jamais d'argent « avalé ».
     */
    private function refundSenderAfterFailedPayout(Transaction $tx, string $reason): void
    {
        $sender = $tx->user_id ? User::find($tx->user_id) : null;
        $refunded = false;

        if ($sender?->phone) {
            try {
                $this->gateway->sendTransfer(new TransferRequest(
                    reference: substr($tx->id, 0, 17).'RF',
                    amount: (float) $tx->amount,
                    currency: $tx->currency,
                    channel: $tx->channel,           // même canal que l'encaissement de l'expéditeur
                    phone: $sender->phone,
                    beneficiaryName: $sender->name ?: 'Expéditeur',
                    reason: 'Remboursement envoi abc pay',
                ));
                $refunded = true;
            } catch (GatewayException) {
                // Remboursement auto impossible → régularisation manuelle (statut failed + alerte).
            }
        }

        $tx->forceFill(['status' => $refunded ? 'remboursee' : 'failed'])->save();

        if ($tx->user_id) {
            $this->notifications->notify(
                $tx->user_id, 'send', 'error', 'Envoi non abouti',
                'Ton envoi de '.$this->money((float) $tx->amount, $tx->currency).' à '.($tx->counterparty_name ?: $tx->counterparty_phone).' n\'a pas pu être livré'
                .($refunded ? ' — tu as été remboursé.' : '. Le remboursement automatique a échoué ; le support régularisera.'),
                ['amount' => (float) $tx->amount, 'currency' => $tx->currency, 'reason' => $reason, 'refunded' => $refunded],
            );
        }
    }

    /** Mouvement miroir « Reçu » + notification si le destinataire est un utilisateur abc pay. */
    private function mirrorReceive(Transaction $tx): void
    {
        if (! $tx->counterparty_phone) {
            return;
        }
        $recipient = User::where('phone', $tx->counterparty_phone)->first();
        if (! $recipient || $recipient->id === $tx->user_id) {
            return;
        }
        $sender = $tx->user_id ? User::find($tx->user_id) : null;

        $credit = Transaction::create([
            'type' => 'receive', 'direction' => 'credit', 'user_id' => $recipient->id,
            'counterparty_name' => $sender?->name, 'counterparty_phone' => $sender?->phone,
            'channel' => $tx->channel, 'amount' => $tx->amount, 'service_fee' => 0,
            'commission' => 0, 'total' => $tx->amount, 'currency' => $tx->currency,
            'status' => 'confirmee', 'confirmed_at' => now(),
        ]);
        $this->receipts->issueFor($credit);

        $this->notifications->notify(
            $recipient->id, 'receive', 'success', 'Argent reçu',
            'Vous avez reçu '.$this->money((float) $tx->amount, $tx->currency).' de '.($sender?->name ?: $sender?->phone ?: 'un proche').'.',
            ['amount' => (float) $tx->amount, 'currency' => $tx->currency, 'from' => $sender?->phone],
        );
    }

    /** Opérateur du DESTINATAIRE déduit de son numéro (préfixes RDC). Repli : M-Pesa. */
    private function recipientChannel(?string $phone): string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);
        if (str_starts_with((string) $digits, '243')) {
            $digits = substr($digits, 3);
        }
        $digits = ltrim((string) $digits, '0');
        $prefix = substr($digits, 0, 2);

        return match (true) {
            in_array($prefix, ['81', '82'], true) => 'mpesa',
            in_array($prefix, ['97', '99'], true) => 'airtel',
            in_array($prefix, ['80', '84', '85', '89'], true) => 'orange',
            $prefix === '90' => 'africell',
            default => 'mpesa',
        };
    }

    /**
     * Confirme un paiement de service (depuis le statut CinetPay ou le webhook) : passe en
     * `confirmee`, émet le reçu, évalue la fraude et notifie le payeur. IDEMPOTENT.
     */
    public function confirmService(Transaction $transaction): void
    {
        if ($transaction->status === 'confirmee') {
            return;
        }

        $transaction->forceFill(['status' => 'confirmee', 'confirmed_at' => now()])->save();
        $this->receipts->issueFor($transaction);
        $this->fraud->flag($transaction);

        if ($transaction->user_id) {
            $this->notifications->notify(
                $transaction->user_id, 'service', 'success', 'Paiement réussi',
                ($transaction->label ?: 'Paiement de service').' de '.$this->money((float) $transaction->amount, $transaction->currency).' effectué.',
                ['amount' => (float) $transaction->amount, 'currency' => $transaction->currency],
            );
        }
    }

    /** Découpe un nom en prénom/nom (min. 2 caractères chacun, exigé par CinetPay). */
    private function splitClientName(?string $full): array
    {
        $parts = preg_split('/\s+/', trim((string) $full), 2, PREG_SPLIT_NO_EMPTY) ?: [];

        return [
            mb_strlen($parts[0] ?? '') >= 2 ? $parts[0] : 'Client',
            mb_strlen($parts[1] ?? '') >= 2 ? $parts[1] : 'AbcPay',
        ];
    }

    /** Raison d'échec (null = succès). Le plafond est comparé en USD (converti). */
    private function failureReason(User $user, array $data, float $amount, string $currency): ?string
    {
        // Compte bloqué (fraude/sécurité) : aucune opération possible — raison explicite.
        if ($user->is_blocked) {
            return 'Compte bloqué. Contacte le support pour le réactiver.';
        }

        $cap = $this->settings->transferCap(); // en USD
        $amountUsd = $this->settings->convert($amount, $currency, 'USD');
        if ($amountUsd > $cap) {
            return 'Plafond de transfert dépassé ('.number_format($cap, 0, ',', ' ').' $).';
        }
        // Plafond CUMULÉ journalier (LBC/FT) : total des transferts confirmés du jour + celui-ci.
        $dailyCap = $cap * self::DAILY_CAP_FACTOR;
        if (($this->confirmedTodayUsd($user) + $amountUsd) > $dailyCap) {
            return 'Plafond journalier de transfert dépassé ('.number_format($dailyCap, 0, ',', ' ').' $).';
        }
        if ($data['type'] === 'send' && ! empty($data['counterparty_phone']) && $data['counterparty_phone'] === $user->phone) {
            return 'Destinataire invalide : vous ne pouvez pas vous envoyer de l\'argent.';
        }

        return null;
    }

    /** Somme (USD) des transferts sortants confirmés de l'utilisateur pour la journée courante. */
    private function confirmedTodayUsd(User $user): float
    {
        $rows = Transaction::query()
            ->where('user_id', $user->id)
            ->where('direction', 'debit')
            ->whereIn('type', ['send', 'service'])
            ->where('status', 'confirmee')
            ->whereDate('created_at', now()->toDateString())
            ->get(['amount', 'currency']);

        return (float) $rows->sum(fn (Transaction $t) => $this->settings->convert((float) $t->amount, $t->currency ?: 'USD', 'USD'));
    }

    private function record(User $user, array $data, float $amount, string $currency, string $status, ?string $idem, ?string $failure = null): Transaction
    {
        return Transaction::create([
            'type' => $data['type'], 'direction' => 'debit', 'user_id' => $user->id,
            'counterparty_name' => $data['counterparty_name'] ?? null,
            'counterparty_phone' => $data['counterparty_phone'] ?? null,
            'label' => $data['label'] ?? null,
            'channel' => $data['channel'], 'amount' => $amount, 'service_fee' => 0,
            'commission' => 0, 'total' => $amount, 'currency' => $currency,
            'status' => $status, 'reference' => $data['reference'] ?? null,
            'idempotency_key' => $idem,
            'confirmed_at' => $status === 'confirmee' ? now() : null,
        ]);
    }

    private function resolveCurrency(array $data): string
    {
        $c = $data['currency'] ?? null;

        return in_array($c, SettingsService::CURRENCIES, true) ? $c : $this->settings->currency();
    }

    private function label(array $data): string
    {
        return $data['type'] === 'send' ? 'Envoi' : ($data['label'] ?? 'Paiement de service');
    }

    private function money(float $n, string $currency): string
    {
        return number_format($n, 2, ',', ' ').' '.($currency === 'CDF' ? 'FC' : '$');
    }

    private function present(Transaction $t, ?string $failure = null): array
    {
        return [
            'transaction' => [
                'id' => $t->id, 'type' => $t->type, 'amount' => $t->amount, 'total' => $t->total,
                'status' => $t->status, 'channel' => $t->channel, 'currency' => $t->currency,
                'counterparty_name' => $t->counterparty_name,
                'failure_reason' => $failure,
            ],
            'receipt' => ['number' => $t->receipt?->number],
        ];
    }
}
