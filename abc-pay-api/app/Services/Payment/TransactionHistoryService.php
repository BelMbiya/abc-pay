<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use App\Models\User;
use App\Services\Platform\SettingsService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Domaine Payment — lecture de l'historique des transactions (payeur / établissement / plateforme).
 * Sortie DDD : le contrôleur orchestre, la mise en forme des DTO est ici.
 */
class TransactionHistoryService
{
    /** Champs relationnels chargés pour la mise en forme (évite le N+1). */
    private const WITH = ['establishment:id,name,type', 'receipt:id,transaction_id,number', 'user:id,phone,name'];

    /** Plafond d'export CSV (garde-fou mémoire). */
    private const EXPORT_CAP = 10000;

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

    /**
     * Recherche plateforme filtrée + paginée (super-admin) : liste, méta de pagination
     * et synthèse (count / volume / commission) calculée SUR LA SÉLECTION courante.
     *
     * @param  array<string, mixed>  $f
     * @return array{transactions: array<int, array<string, mixed>>, meta: array<string, int>, summary: array<string, mixed>}
     */
    public function platformSearch(array $f): array
    {
        $perPage = min(max((int) ($f['per_page'] ?? 25), 1), 100);
        $page = max((int) ($f['page'] ?? 1), 1);

        $summary = $this->summaryOf($this->applyFilters(Transaction::query(), $f));
        $total = (int) $summary['count'];
        $lastPage = max(1, (int) ceil($total / $perPage));

        $paged = $this->applyFilters(Transaction::query(), $f)
            ->with(self::WITH)
            ->latest()
            ->forPage($page, $perPage)
            ->get();

        return [
            'transactions' => $paged->map(fn (Transaction $t) => $this->mapRow($t))->all(),
            'meta' => ['page' => $page, 'per_page' => $perPage, 'total' => $total, 'last_page' => $lastPage],
            'summary' => $summary,
        ];
    }

    /**
     * Lignes filtrées pour l'export CSV (plafonnées), les plus récentes d'abord.
     *
     * @param  array<string, mixed>  $f
     * @return array<int, array<string, mixed>>
     */
    public function exportRows(array $f): array
    {
        $rows = $this->applyFilters(Transaction::query(), $f)
            ->with(self::WITH)
            ->latest()
            ->limit(self::EXPORT_CAP)
            ->get();

        return $rows->map(fn (Transaction $t) => $this->mapRow($t))->all();
    }

    /** Synthèse plateforme (super-admin) : volume + commission convertis en devise plateforme. */
    public function platformSummary(): array
    {
        return $this->summaryOf(Transaction::query()->where('status', 'confirmee'));
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
     * Synthèse (count/volume/commission) d'une requête, agrégée par devise en SQL puis
     * convertie en devise plateforme (efficace, ne charge pas toutes les lignes).
     *
     * @return array{count: int, base_currency: string, volume: float, commission: float}
     */
    private function summaryOf(Builder $q): array
    {
        $base = $this->settings->currency();
        $byCurrency = $q->reorder()
            ->selectRaw('currency, COUNT(*) as cnt, SUM(amount) as vol, SUM(commission) as comm')
            ->groupBy('currency')
            ->get();

        return [
            'count' => (int) $byCurrency->sum('cnt'),
            'base_currency' => $base,
            'volume' => round($byCurrency->sum(fn ($r) => $this->settings->convert((float) $r->vol, $r->currency ?: $base, $base)), 2),
            'commission' => round($byCurrency->sum(fn ($r) => $this->settings->convert((float) $r->comm, $r->currency ?: $base, $base)), 2),
        ];
    }

    /**
     * Applique les filtres de recherche plateforme (allowlist déjà validée par le FormRequest).
     *
     * @param  array<string, mixed>  $f
     */
    private function applyFilters(Builder $q, array $f): Builder
    {
        $has = fn (string $k) => isset($f[$k]) && $f[$k] !== '' && $f[$k] !== null;

        if ($has('type')) {
            $q->where('type', $f['type']);
        }
        if ($has('direction')) {
            $q->where('direction', $f['direction']);
        }
        if ($has('status')) {
            $q->where('status', $f['status']);
        }
        if ($has('channel')) {
            $q->where('channel', $f['channel']);
        }
        if ($has('establishment_id')) {
            $q->where('establishment_id', $f['establishment_id']);
        }
        if (($f['scope'] ?? null) === 'establishment') {
            $q->whereNotNull('establishment_id');
        } elseif (($f['scope'] ?? null) === 'user') {
            $q->whereNotNull('user_id');
        }
        if ($has('registered')) {
            filter_var($f['registered'], FILTER_VALIDATE_BOOLEAN)
                ? $q->whereNotNull('user_id')
                : $q->whereNull('user_id');
        }
        if ($has('date_from')) {
            $q->whereDate('created_at', '>=', $f['date_from']);
        }
        if ($has('date_to')) {
            $q->whereDate('created_at', '<=', $f['date_to']);
        }
        if ($has('amount_min')) {
            $q->where('amount', '>=', (float) $f['amount_min']);
        }
        if ($has('amount_max')) {
            $q->where('amount', '<=', (float) $f['amount_max']);
        }
        if ($has('q')) {
            // Insensible à la casse : ILIKE sous PostgreSQL (cible prod), LIKE sinon (sqlite dev).
            $op = DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';
            $term = '%'.addcslashes(trim((string) $f['q']), '%_\\').'%';
            $q->where(function (Builder $w) use ($op, $term) {
                $w->where('reference', $op, $term)
                    ->orWhere('label', $op, $term)
                    ->orWhere('student_name', $op, $term)
                    ->orWhere('student_matricule', $op, $term)
                    ->orWhere('payer_name', $op, $term)
                    ->orWhere('payer_phone', $op, $term)
                    ->orWhere('counterparty_name', $op, $term)
                    ->orWhere('counterparty_phone', $op, $term)
                    ->orWhereHas('establishment', fn (Builder $e) => $e->where('name', $op, $term))
                    ->orWhereHas('user', fn (Builder $u) => $u->where('name', $op, $term)->orWhere('phone', $op, $term))
                    ->orWhereHas('receipt', fn (Builder $r) => $r->where('number', $op, $term));
            });
        }

        return $q;
    }

    /**
     * @param  callable(Builder): Builder  $scope
     * @return array<int, array<string, mixed>>
     */
    private function rows(callable $scope, int $limit): array
    {
        $query = Transaction::query()->with(self::WITH)->latest()->limit($limit);

        return $scope($query)->get()->map(fn (Transaction $t) => $this->mapRow($t))->all();
    }

    /**
     * Met en forme une transaction en DTO (partagé par toutes les vues).
     *
     * @return array<string, mixed>
     */
    private function mapRow(Transaction $t): array
    {
        return [
            'id' => $t->id,
            'type' => $t->type,
            'direction' => $t->direction,
            // Compte ACTEUR : qui a réalisé l'opération (audit). Compte connecté si
            // présent, sinon le payeur tiers, sinon anonyme.
            'actor' => $t->user ? ($t->user->name ?: $t->user->phone) : ($t->payer_name ?: 'Tiers non connecté'),
            'actor_phone' => $t->user?->phone ?? $t->payer_phone,
            'actor_registered' => $t->user_id !== null,
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
        ];
    }
}
