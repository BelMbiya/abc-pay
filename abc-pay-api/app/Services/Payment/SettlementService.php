<?php

namespace App\Services\Payment;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\Settlement;
use App\Models\Transaction;
use App\Services\Notification\NotificationService;
use App\Services\Payment\Exceptions\NothingToSettleException;
use App\Services\Payment\Gateways\Contracts\PaymentGateway;
use App\Services\Payment\Gateways\Contracts\TransferRequest;
use App\Services\Payment\Gateways\Exceptions\GatewayException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Domaine Payment — REVERSEMENTS (abc pay → établissement).
 *
 * Modèle réel (et non plus « à la volée ») :
 *  - EN ATTENTE = encaissements confirmés non encore reversés (transactions sans
 *    `settlement_id`). Le net = brut − commission.
 *  - REVERSÉ = ligne `settlements` créée par un ACTE admin (`execute`), qui fige les
 *    montants et rattache les transactions concernées. Le statut change ainsi de
 *    « en attente » à « reversé » (fini le regroupement hebdomadaire arbitraire :
 *    le reversement a lieu quand abc pay l'exécute).
 */
class SettlementService
{
    public function __construct(private readonly PaymentGateway $gateway) {}

    /** Encaissements confirmés PAS ENCORE reversés (le « à reverser » du moment). */
    public function pendingFor(string $establishmentId): array
    {
        $txs = Transaction::query()
            ->where('establishment_id', $establishmentId)
            ->where('status', 'confirmee')
            ->whereNull('settlement_id')
            ->get(['amount', 'commission', 'created_at']);

        $gross = round((float) $txs->sum('amount'), 2);
        $commission = round((float) $txs->sum('commission'), 2);

        return [
            'gross' => $gross,
            'commission' => $commission,
            'net' => round($gross - $commission, 2),
            'count' => $txs->count(),
            'period_start' => optional($txs->min('created_at'))?->toDateString(),
            'period_end' => optional($txs->max('created_at'))?->toDateString(),
        ];
    }

    /**
     * Vue de l'onglet « Reversements » (staff) : ligne « en attente » (si montant à
     * reverser) + historique des reversements RÉELS. Contrat de sortie préservé.
     */
    public function forEstablishment(string $establishmentId): array
    {
        $pending = $this->pendingFor($establishmentId);

        $history = Settlement::query()
            ->where('establishment_id', $establishmentId)
            ->orderByDesc('paid_at')
            ->orderByDesc('created_at')
            ->get();

        $rows = [];
        if ($pending['count'] > 0) {
            $rows[] = [
                'week_start' => 'pending', // clé stable côté front
                'period' => $this->periodLabel($pending['period_start'], $pending['period_end']),
                'gross' => $pending['gross'],
                'commission' => $pending['commission'],
                'net' => $pending['net'],
                'count' => $pending['count'],
                'status' => 'pending',
                'reference' => null,
                'paid_at' => null,
            ];
        }
        foreach ($history as $s) {
            $rows[] = [
                'week_start' => $s->id, // clé stable côté front
                'period' => $this->periodLabel($s->period_start?->toDateString(), $s->period_end?->toDateString()),
                'gross' => (float) $s->gross,
                'commission' => (float) $s->commission,
                'net' => (float) $s->net,
                'count' => (int) $s->transactions_count,
                'status' => 'paid',
                'reference' => $s->reference,
                'paid_at' => $s->paid_at?->toDateString(),
                // Traçabilité : passerelle + id du transfert (à retrouver côté portail Araka/CinetPay).
                // Absent (null) = reversement en mode démo (acte comptable, sans décaissement réel).
                'gateway' => $s->gateway,
                'transfer_id' => $s->gateway_transfer_id,
            ];
        }

        return [
            'pending_net' => $pending['net'],
            'pending_period' => $pending['count'] > 0
                ? $this->periodLabel($pending['period_start'], $pending['period_end'])
                : null,
            'total_net' => round((float) $history->sum('net'), 2),
            'settlements' => $rows,
            'weekly' => $this->weekly($establishmentId),
        ];
    }

    /**
     * ACTE ADMIN : exécute le reversement des encaissements en attente d'un
     * établissement. Fige les montants dans une ligne `settlements` (statut « reversé »)
     * et rattache les transactions concernées. Notifie l'établissement.
     *
     * @throws NothingToSettleException  si rien n'est en attente
     */
    public function execute(Establishment $establishment, ?string $reference = null, ?string $executedBy = null): Settlement
    {
        // Établissement SUSPENDU : au-delà de ne plus encaisser, il ne peut plus être reversé
        // (fonds gelés tant qu'il n'est pas réactivé — litige / conformité). Barrière autoritaire.
        if (! $establishment->is_active) {
            throw ValidationException::withMessages([
                'establishment' => 'Établissement suspendu : le reversement est bloqué tant qu\'il n\'est pas réactivé.',
            ]);
        }

        return DB::transaction(function () use ($establishment, $reference, $executedBy) {
            // VERROU (anti double-reversement) : `lockForUpdate` sérialise deux exécutions
            // concurrentes (Postgres) — la seconde attend puis ne voit plus rien à reverser.
            $txs = Transaction::query()
                ->where('establishment_id', $establishment->id)
                ->where('status', 'confirmee')
                ->whereNull('settlement_id')
                ->lockForUpdate()
                ->get();

            if ($txs->isEmpty()) {
                throw new NothingToSettleException();
            }

            $ids = $txs->pluck('id');
            $gross = round((float) $txs->sum('amount'), 2);
            $commission = round((float) $txs->sum('commission'), 2);
            $net = round($gross - $commission, 2);

            // Reversement AUTOMATIQUE (décaissement réel via la passerelle ACTIVE — CinetPay
            // `/transfer` ou Araka `/sendmobilemoney`) : piloté par le module transfert de la
            // passerelle, indépendant de l'encaissement. OFF → acte comptable (marqué « payé »).
            // ON → transfert réel, qui exige un numéro de réception (mobile money).
            $payoutAuto = $this->gateway->payoutEnabled();
            if ($payoutAuto && ! $establishment->payout_phone) {
                throw ValidationException::withMessages([
                    'payout_phone' => "Reversement automatique activé mais l'établissement n'a pas de numéro de reversement (mobile money) configuré. Renseigne-le, ou désactive le reversement automatique.",
                ]);
            }

            $settlement = Settlement::create([
                'establishment_id' => $establishment->id,
                'period_start' => optional($txs->min('created_at'))?->toDateString(),
                'period_end' => optional($txs->max('created_at'))?->toDateString(),
                'gross' => $gross,
                'commission' => $commission,
                'net' => $net,
                'currency' => $establishment->currency ?: 'USD',
                'transactions_count' => $txs->count(),
                'status' => $payoutAuto ? 'pending' : 'paid', // réel = posé par le webhook transfert
                'gateway' => $payoutAuto ? $this->gateway->name() : null,
                'reference' => $reference,
                'executed_by' => $executedBy,
                'paid_at' => $payoutAuto ? null : now(),
            ]);

            // Rattachement GARDÉ : on ne solde que ce qui est encore en attente. Si une
            // exécution concurrente en a déjà soldé une partie, on annule (intégrité > tout).
            $attached = Transaction::whereIn('id', $ids)->whereNull('settlement_id')
                ->update(['settlement_id' => $settlement->id]);

            if ($attached !== $ids->count()) {
                throw new NothingToSettleException();
            }

            if ($payoutAuto) {
                // Décaissement RÉEL via la passerelle active (CinetPay ou Araka). Atomique :
                // si l'appel échoue, toute la transaction DB est annulée (aucun reversement
                // fantôme). Confirmation immédiate (Success) ou via webhook (Pending).
                try {
                    $transfer = $this->gateway->sendTransfer(new TransferRequest(
                        reference: $settlement->id,
                        amount: $net,
                        currency: $settlement->currency,
                        channel: $establishment->payout_method,
                        phone: $establishment->payout_phone,
                        beneficiaryName: $establishment->name,
                        reason: 'Reversement abc pay',
                    ));
                } catch (GatewayException $e) {
                    // Message déjà lisible (IP non autorisée, module inactif, refus…).
                    throw ValidationException::withMessages(['transfer' => $e->getMessage()]);
                }

                // Success = décaissé → « payé » immédiatement (indispensable en local, et cas
                // synchrone Araka/CinetPay RDC). Pending = accepté → le webhook posera « paid ».
                $settlement->forceFill([
                    'gateway_transfer_id' => $transfer->providerRef,
                    'notify_token' => $transfer->notifyToken,
                    'status' => $transfer->isDone() ? 'paid' : $settlement->status,
                    'paid_at' => $transfer->isDone() ? now() : $settlement->paid_at,
                ])->save();
            } else {
                // Sans passerelle (démo) : reversement réputé effectué immédiatement.
                $this->notifyStaff($establishment, $settlement);
            }

            return $settlement;
        });
    }

    /** Notifie le staff de l'établissement qu'un reversement a été effectué. */
    private function notifyStaff(Establishment $establishment, Settlement $settlement): void
    {
        $notifier = app(NotificationService::class);
        $sym = $settlement->currency === 'CDF' ? 'FC' : '$';
        $staffIds = EstablishmentStaff::where('establishment_id', $establishment->id)
            ->pluck('user_id')->unique();

        foreach ($staffIds as $sid) {
            $notifier->notify(
                $sid, 'settlement', 'success', 'Reversement effectué',
                'Un reversement de '.number_format((float) $settlement->net, 2, ',', ' ').' '.$sym.' a été effectué par abc pay.',
                ['net' => (float) $settlement->net, 'reference' => $settlement->reference],
            );
        }
    }

    /** Libellé lisible d'une période (jour unique ou intervalle). */
    private function periodLabel(?string $start, ?string $end): string
    {
        if (! $start && ! $end) {
            return 'Période courante';
        }
        $s = $start ? Carbon::parse($start)->translatedFormat('d M') : null;
        $e = $end ? Carbon::parse($end)->translatedFormat('d M Y') : null;

        if ($s && $e && Carbon::parse($start)->isSameDay(Carbon::parse($end))) {
            return $e;
        }

        return 'Du '.($s ?? '—').' au '.($e ?? '—');
    }

    /** Série (net encaissé par semaine, 8 dernières) — visualisation du graphe. */
    private function weekly(string $establishmentId): array
    {
        $txs = Transaction::query()
            ->where('establishment_id', $establishmentId)
            ->where('status', 'confirmee')
            ->get(['amount', 'commission', 'created_at']);

        return $txs
            ->groupBy(fn (Transaction $t) => $t->created_at->copy()->startOfWeek()->toDateString())
            ->map(fn ($group, string $week) => [
                'week' => $week,
                'net' => round((float) $group->sum('amount') - (float) $group->sum('commission'), 2),
            ])
            ->sortBy('week')
            ->values()
            ->take(-8)
            ->map(fn (array $r) => ['label' => Carbon::parse($r['week'])->translatedFormat('d M'), 'net' => $r['net']])
            ->all();
    }
}
