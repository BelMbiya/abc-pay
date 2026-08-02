<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Models\User;
use App\Services\Platform\SettingsService;
use Illuminate\Database\Eloquent\Builder;

/**
 * Domaine Payment — lecture de l'historique des transactions (payeur / établissement / plateforme).
 * Sortie DDD : le contrôleur orchestre, la mise en forme des DTO est ici.
 */
class TransactionHistoryService
{
    public function __construct(private readonly SettingsService $settings) {}

    /** Transactions du payeur authentifié. */
    public function forUser(User $user, int $limit = 100): array
    {
        return $this->rows(fn (Builder $q) => $q->where('user_id', $user->id), $limit);
    }

    /** Transactions reçues par un établissement (back-office). */
    public function forEstablishment(string $establishmentId, int $limit = 200): array
    {
        return $this->rows(fn (Builder $q) => $q->where('establishment_id', $establishmentId), $limit);
    }

    /** Toutes les transactions (super-admin), avec l'établissement. */
    public function platformWide(int $limit = 300): array
    {
        return $this->rows(fn (Builder $q) => $q, $limit);
    }

    /** Synthèse plateforme (super-admin) : volume + commission convertis en devise plateforme. */
    public function platformSummary(): array
    {
        $base = $this->settings->currency();
        $txs = Transaction::query()->where('status', 'confirmee')->get(['amount', 'commission', 'currency']);

        return [
            'count' => $txs->count(),
            'base_currency' => $base,
            'volume' => round($txs->sum(fn ($t) => $this->settings->convert((float) $t->amount, $t->currency ?: $base, $base)), 2),
            'commission' => round($txs->sum(fn ($t) => $this->settings->convert((float) $t->commission, $t->currency ?: $base, $base)), 2),
        ];
    }

    /** Synthèse d'un établissement : encaissé + commission + net reversé. */
    public function establishmentSummary(string $establishmentId): array
    {
        $q = Transaction::query()->where('establishment_id', $establishmentId)->where('status', 'confirmee');
        $volume = (float) $q->clone()->sum('amount');
        $commission = (float) $q->clone()->sum('commission');

        return [
            'count' => (int) $q->clone()->count(),
            'volume' => $volume,
            'commission' => $commission,
            'net' => round($volume - $commission, 2),
        ];
    }

    /**
     * @param  callable(Builder): Builder  $scope
     * @return array<int, array<string, mixed>>
     */
    private function rows(callable $scope, int $limit): array
    {
        $query = Transaction::query()
            ->with(['establishment:id,name,type', 'receipt:id,transaction_id,number'])
            ->latest()
            ->limit($limit);

        return $scope($query)->get()->map(fn (Transaction $t) => [
            'id' => $t->id,
            'type' => $t->type,
            'direction' => $t->direction,
            'establishment' => $t->establishment?->name,
            'establishment_type' => $t->establishment?->type,
            'student_name' => $t->student_name,
            'student_matricule' => $t->student_matricule,
            'payer_name' => $t->payer_name,
            'payer_phone' => $t->payer_phone,
            'counterparty_name' => $t->counterparty_name,
            'counterparty_phone' => $t->counterparty_phone,
            'label' => $t->label,
            'fee_type' => $t->fee_type,
            'channel' => $t->channel,
            'amount' => (float) $t->amount,
            'service_fee' => (float) $t->service_fee,
            'commission' => (float) $t->commission,
            'net' => round((float) $t->amount - (float) $t->commission, 2),
            'total' => (float) $t->total,
            'currency' => $t->currency,
            'status' => $t->status,
            'reference' => $t->reference,
            'receipt_number' => $t->receipt?->number,
            'created_at' => $t->created_at?->toIso8601String(),
        ])->all();
    }
}
