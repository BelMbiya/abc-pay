<?php

namespace App\Services\Reporting;

use App\Models\Establishment;
use App\Models\FeeItem;
use App\Models\Learner;
use App\Models\Transaction;
use App\Services\Platform\SettingsService;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Domaine Reporting — agrégats pour les tableaux de bord (établissement + plateforme).
 * Les montants sont convertis vers une devise de BASE (plateforme, ou celle de
 * l'établissement) via le taux de change, pour agréger des devises différentes.
 */
class StatsService
{
    private const OPERATORS = [
        'mpesa' => 'M-Pesa', 'airtel' => 'Airtel Money', 'orange' => 'Orange Money',
        'africell' => 'Africell Money', 'visa' => 'Carte Visa',
    ];

    public function __construct(private readonly SettingsService $settings) {}

    /** Périodes de filtrage des FLUX (encaissé/net/canaux). Défaut = aujourd'hui. */
    public const PERIODS = ['today', 'week', 'month', 'all'];

    /**
     * Tableau de bord d'un établissement (dans SA devise).
     *
     * `$period` filtre les FLUX (Encaissé, Net à reverser, répartition par canal) :
     * today | week (7 j) | month (30 j) | all. Les indicateurs d'ÉTAT (Attendu, Taux de
     * recouvrement — dérivés du barème/dettes) restent CUMULATIFS (indépendants de la
     * période), et la tendance hebdomadaire reste une série (8 semaines).
     */
    public function forEstablishment(string $establishmentId, string $period = 'today'): array
    {
        $base = Establishment::whereKey($establishmentId)->value('currency') ?: 'USD';
        $period = in_array($period, self::PERIODS, true) ? $period : 'today';

        // Tous les encaissements confirmés (pour l'état cumulatif + la tendance hebdo).
        $allTxs = Transaction::query()
            ->where('establishment_id', $establishmentId)->where('status', 'confirmee')
            ->where('direction', 'debit') // encaissements uniquement (exclut les crédits de remboursement)
            ->get(['amount', 'commission', 'channel', 'currency', 'created_at']);

        // Sous-ensemble de la PÉRIODE pour les flux.
        $periodTxs = $this->filterByPeriod($allTxs, $period);

        $collected = $this->sumBase($periodTxs, 'amount', $base);
        $totalCollected = $this->sumBase($allTxs, 'amount', $base); // cumul TOUT confirmé (repère de revenu)
        $commission = $this->sumBase($periodTxs, 'commission', $base);
        $expected = round((float) FeeItem::where('establishment_id', $establishmentId)->sum('amount_due'), 2);
        $paid = round((float) FeeItem::where('establishment_id', $establishmentId)->sum('amount_paid'), 2);
        $recovery = $expected > 0 ? round($paid / $expected * 100, 1) : 0.0;

        return [
            'base_currency' => $base,
            'period' => $period,
            'kpis' => [
                'expected' => $expected,                         // cumulatif (état, réconciliation)
                'total_collected' => $totalCollected,            // cumulatif — total encaissé (tout confirmé)
                'collected' => $collected,                       // flux (période)
                'recovery_rate' => $recovery,                    // cumulatif (état, réconciliation)
                'remaining' => round($expected - $paid, 2),      // cumulatif (état, réconciliation)
                'pending_net' => $collected,                     // flux (période) — montant plein (frais chez le payeur)
                'count' => $periodTxs->count(),                  // flux (période) — nb d'encaissements
                'avg_ticket' => $periodTxs->count() > 0 ? round($collected / $periodTxs->count(), 2) : 0.0, // ticket moyen
            ],
            'weekly' => $this->weekly($allTxs, $base),           // tendance (8 semaines)
            'by_channel' => $this->channelBreakdown($periodTxs, $base, $collected),
            'unpaid' => $this->topUnpaid($establishmentId),
        ];
    }

    /** Restreint une collection de transactions à la période demandée (par `created_at`). */
    private function filterByPeriod(Collection $txs, string $period): Collection
    {
        if ($period === 'all') {
            return $txs;
        }
        $from = match ($period) {
            'week' => Carbon::now()->subDays(7),
            'month' => Carbon::now()->subDays(30),
            default => Carbon::now()->startOfDay(), // today
        };

        return $txs->filter(fn (Transaction $t) => $t->created_at !== null && $t->created_at->greaterThanOrEqualTo($from));
    }

    /** Tableau de bord plateforme (super-admin) — tout converti en devise plateforme. */
    public function platform(): array
    {
        $base = $this->settings->currency();

        $txs = Transaction::query()->where('status', 'confirmee')
            ->where('direction', 'debit') // encaissements uniquement (exclut les crédits de remboursement)
            ->get(['amount', 'commission', 'channel', 'currency', 'establishment_id', 'created_at']);

        $volume = $this->sumBase($txs, 'amount', $base);

        return [
            'base_currency' => $base,
            'kpis' => [
                'volume' => $volume,
                'commission' => $this->sumBase($txs, 'commission', $base),
                'establishments' => Establishment::count(),
                'active_establishments' => Establishment::where('is_active', true)->count(),
                'transactions' => $txs->count(),
            ],
            'weekly' => $this->weekly($txs, $base),
            'by_operator' => $this->channelBreakdown($txs, $base, $volume),
            'operators_health' => $this->operatorsHealth($txs),
            'top_establishments' => $this->topEstablishments($txs, $base),
            'alerts' => $this->riskAlerts($txs),
        ];
    }

    /** Somme d'un champ (amount/commission) convertie vers la devise de base. */
    private function sumBase(Collection $txs, string $field, string $base): float
    {
        return round($txs->sum(fn (Transaction $t) => $this->settings->convert((float) $t->{$field}, $t->currency ?: $base, $base)), 2);
    }

    /** Série hebdomadaire (8 dernières semaines, chronologique) en devise de base. */
    private function weekly(Collection $txs, string $base): array
    {
        return $txs->groupBy(fn (Transaction $t) => $t->created_at->copy()->startOfWeek()->toDateString())
            ->map(fn ($g, string $w) => ['week' => $w, 'label' => Carbon::parse($w)->translatedFormat('d M'), 'value' => $this->sumBase($g, 'amount', $base)])
            ->sortBy('week')->values()->take(-8)->values()->all();
    }

    /** Répartition par canal (montant en base + pourcentage). */
    private function channelBreakdown(Collection $txs, string $base, float $total): array
    {
        return $txs->groupBy('channel')
            ->map(function ($g, string $ch) use ($base, $total) {
                $amount = $this->sumBase($g, 'amount', $base);

                return [
                    'channel' => $ch,
                    'label' => self::OPERATORS[$ch] ?? $ch,
                    'amount' => $amount,
                    'pct' => $total > 0 ? (int) round($amount / $total * 100) : 0,
                ];
            })
            ->sortByDesc('amount')->values()->all();
    }

    /** Top 5 des apprenants en dette (solde = dû − payé). */
    private function topUnpaid(string $establishmentId): array
    {
        $balances = FeeItem::query()
            ->where('establishment_id', $establishmentId)
            ->selectRaw('learner_id, SUM(amount_due - amount_paid) as bal')
            ->groupBy('learner_id')->havingRaw('SUM(amount_due - amount_paid) > 0')
            ->orderByDesc('bal')->limit(5)->get();

        $learners = Learner::whereIn('id', $balances->pluck('learner_id'))->get()->keyBy('id');

        return $balances->map(function ($b) use ($learners) {
            $l = $learners[$b->learner_id] ?? null;

            return [
                'id' => $b->learner_id,
                'name' => trim(($l->last_name ?? '').' '.($l->first_name ?? '')) ?: '—',
                'group' => $l->academic_group ?? '—',
                'balance' => round((float) $b->bal, 2),
            ];
        })->values()->all();
    }

    private function operatorsHealth(Collection $txs): array
    {
        return collect(self::OPERATORS)->map(fn (string $label, string $ch) => [
            'name' => $label,
            'count' => $txs->where('channel', $ch)->count(),
            'status' => $txs->where('channel', $ch)->count() > 0 ? 'operational' : 'idle',
        ])->values()->all();
    }

    private function topEstablishments(Collection $txs, string $base): array
    {
        $byEst = $txs->whereNotNull('establishment_id')->groupBy('establishment_id')
            ->map(fn ($g) => $this->sumBase($g, 'amount', $base))->sortDesc()->take(5);

        $names = Establishment::whereIn('id', $byEst->keys())->pluck('name', 'id');

        return $byEst->map(fn ($vol, $eid) => ['name' => $names[$eid] ?? '—', 'volume' => $vol])->values()->all();
    }

    /** Alertes de risque dérivées des données (heuristiques simples, réelles). */
    private function riskAlerts(Collection $txs): array
    {
        $alerts = [];
        $large = $txs->where('amount', '>=', 500)->count();
        if ($large > 0) {
            $alerts[] = ['title' => 'Paiements élevés', 'level' => 'medium', 'detail' => "$large paiement(s) élevé(s) à surveiller."];
        }
        $failed = Transaction::where('status', 'echouee')->count();
        if ($failed > 0) {
            $alerts[] = ['title' => 'Transactions échouées', 'level' => 'high', 'detail' => "$failed transaction(s) en échec récemment."];
        }

        return $alerts;
    }
}
