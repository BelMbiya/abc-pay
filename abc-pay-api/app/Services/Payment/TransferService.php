<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Models\User;
use App\Services\Document\ReceiptService;
use App\Services\Fraud\FraudService;
use App\Services\Notification\NotificationService;
use App\Services\Platform\SettingsService;
use Illuminate\Support\Facades\DB;

/**
 * Domaine Payment — transactions NON-Tuition du payeur (envoi P2P, paiement de service).
 * Gère le cycle succès/échec, la devise choisie, le mouvement miroir « Reçu » et les
 * notifications instantanées (succès → destinataire ; échec → expéditeur avec la raison).
 */
class TransferService
{
    public function __construct(
        private readonly ReceiptService $receipts,
        private readonly NotificationService $notifications,
        private readonly SettingsService $settings,
        private readonly FraudService $fraud,
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

            // ── Succès ──
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

            // Vice-versa : mouvement miroir « Reçu » + notification du DESTINATAIRE.
            if ($data['type'] === 'send' && ! empty($data['counterparty_phone'])) {
                $recipient = User::where('phone', $data['counterparty_phone'])->first();
                if ($recipient && $recipient->id !== $user->id) {
                    $credit = Transaction::create([
                        'type' => 'receive', 'direction' => 'credit', 'user_id' => $recipient->id,
                        'counterparty_name' => $user->name, 'counterparty_phone' => $user->phone,
                        'channel' => $data['channel'], 'amount' => $amount, 'service_fee' => 0,
                        'commission' => 0, 'total' => $amount, 'currency' => $currency,
                        'status' => 'confirmee', 'confirmed_at' => now(),
                    ]);
                    $this->receipts->issueFor($credit);

                    $this->notifications->notify(
                        $recipient->id, 'receive', 'success',
                        'Argent reçu',
                        'Vous avez reçu '.$this->money($amount, $currency).' de '.($user->name ?: $user->phone).'.',
                        ['amount' => $amount, 'currency' => $currency, 'from' => $user->phone],
                    );
                }
            }

            return $this->present($tx->fresh('receipt'));
        });
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
        if ($data['type'] === 'send' && ! empty($data['counterparty_phone']) && $data['counterparty_phone'] === $user->phone) {
            return 'Destinataire invalide : vous ne pouvez pas vous envoyer de l\'argent.';
        }

        return null;
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
