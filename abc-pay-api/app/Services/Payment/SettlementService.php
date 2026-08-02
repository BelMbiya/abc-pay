<?php

namespace App\Services\Payment;

use App\Models\Transaction;
use Illuminate\Support\Carbon;

/**
 * Domaine Payment — reversements (settlements) d'un établissement, DÉRIVÉS des
 * transactions confirmées et regroupés par semaine. Le net = encaissé − commission.
 * (Le module de règlement effectif viendra ; ici on expose des agrégats réels.)
 */
class SettlementService
{
    public function forEstablishment(string $establishmentId): array
    {
        $txs = Transaction::query()
            ->where('establishment_id', $establishmentId)
            ->where('status', 'confirmee')
            ->orderByDesc('created_at')
            ->get(['amount', 'commission', 'created_at']);

        $weeks = $txs->groupBy(fn (Transaction $t) => $t->created_at->copy()->startOfWeek()->toDateString());

        $settlements = $weeks
            ->map(function ($group, string $weekStart) {
                $gross = round((float) $group->sum('amount'), 2);
                $commission = round((float) $group->sum('commission'), 2);

                return [
                    'week_start' => $weekStart,
                    'period' => 'Semaine du '.Carbon::parse($weekStart)->translatedFormat('d M Y'),
                    'gross' => $gross,
                    'commission' => $commission,
                    'net' => round($gross - $commission, 2),
                    'count' => $group->count(),
                ];
            })
            ->sortByDesc('week_start')
            ->values()
            // La semaine la plus récente est « en attente », les précédentes « reversées ».
            ->map(fn (array $s, int $i) => array_merge($s, ['status' => $i === 0 ? 'pending' : 'paid']));

        $pending = $settlements->firstWhere('status', 'pending');

        return [
            'pending_net' => (float) ($pending['net'] ?? 0),
            'pending_period' => $pending['period'] ?? null,
            'total_net' => round((float) $settlements->sum('net'), 2),
            'settlements' => $settlements->all(),
            // Série hebdo (chronologique) pour le graphe.
            'weekly' => $settlements->take(8)->reverse()->values()
                ->map(fn (array $s) => ['label' => Carbon::parse($s['week_start'])->translatedFormat('d M'), 'net' => $s['net']])
                ->all(),
        ];
    }
}
