<?php

namespace App\Services\Payment;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\Settlement;
use App\Models\SettlementAdjustment;
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
            ->where('direction', 'debit') // encaissements uniquement (exclut les crédits de remboursement)
            ->whereNull('settlement_id')
            ->get(['amount', 'commission', 'created_at']);

        $gross = round((float) $txs->sum('amount'), 2);
        $commission = round((float) $txs->sum('commission'), 2);

        // Reprises (clawback) en attente : déduites du net à reverser (remboursements déjà reversés).
        $clawback = round((float) SettlementAdjustment::query()
            ->where('establishment_id', $establishmentId)
            ->whereNull('settlement_id')
            ->sum('amount'), 2);

        return [
            'gross' => $gross,
            'commission' => $commission, // revenu abc pay (frais réglés par les payeurs) — NON déduit
            'clawback' => $clawback,     // reprises en attente
            'net' => round($gross - $clawback, 2), // net = montant plein − reprises
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
        // Ligne « en attente » dès qu'il y a des encaissements OU une reprise en attente (dette).
        if ($pending['count'] > 0 || $pending['clawback'] > 0) {
            $rows[] = [
                'week_start' => 'pending', // clé stable côté front
                'period' => $this->periodLabel($pending['period_start'], $pending['period_end']),
                'gross' => $pending['gross'],
                'commission' => $pending['commission'],
                'clawback' => $pending['clawback'],
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
                'clawback' => (float) $s->clawback,
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
            'pending_clawback' => $pending['clawback'], // reprises en attente (déduites du net)
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
                ->where('direction', 'debit') // encaissements uniquement (exclut les crédits de remboursement)
                ->whereNull('settlement_id')
                ->lockForUpdate()
                ->get();

            if ($txs->isEmpty()) {
                throw new NothingToSettleException();
            }

            $ids = $txs->pluck('id');
            $gross = round((float) $txs->sum('amount'), 2);
            $commission = round((float) $txs->sum('commission'), 2);

            // REPRISES (clawback) en attente : remboursements de transactions déjà reversées.
            // Elles sont DÉDUITES du montant à reverser (verrou anti-concurrence).
            $adjustments = SettlementAdjustment::query()
                ->where('establishment_id', $establishment->id)
                ->whereNull('settlement_id')
                ->lockForUpdate()
                ->get();
            $clawback = round((float) $adjustments->sum('amount'), 2);
            $net = round($gross - $clawback, 2); // frais chez le payeur → net = brut − reprises

            // Reprise supérieure au montant à reverser : on ne peut pas payer un net négatif.
            // On bloque (la reprise reste en attente, déduite d'un prochain reversement plus garni).
            if ($net < 0) {
                throw ValidationException::withMessages([
                    'clawback' => 'Reprise en attente ('.number_format($clawback, 2, ',', ' ').') supérieure au montant à reverser ('
                        .number_format($gross, 2, ',', ' ').'). Attends de nouveaux encaissements ou régularise hors-bande.',
                ]);
            }

            // Décaissement RÉEL seulement si la passerelle l'active ET qu'il reste un net > 0.
            // (net = 0 = pending entièrement absorbé par les reprises → acte comptable, sans transfert.)
            $payoutAuto = $this->gateway->payoutEnabled();
            $doPayout = $payoutAuto && $net > 0;
            if ($doPayout && ! $establishment->payout_phone) {
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
                'clawback' => $clawback,
                'net' => $net,
                'currency' => $establishment->currency ?: 'USD',
                'transactions_count' => $txs->count(),
                'status' => $doPayout ? 'pending' : 'paid', // réel = posé par le webhook transfert
                'gateway' => $doPayout ? $this->gateway->name() : null,
                'reference' => $reference,
                'executed_by' => $executedBy,
                'paid_at' => $doPayout ? null : now(),
            ]);

            // Rattachement GARDÉ : on ne solde que ce qui est encore en attente. Si une
            // exécution concurrente en a déjà soldé une partie, on annule (intégrité > tout).
            $attached = Transaction::whereIn('id', $ids)->whereNull('settlement_id')
                ->update(['settlement_id' => $settlement->id]);

            if ($attached !== $ids->count()) {
                throw new NothingToSettleException();
            }

            // Application des reprises : on les rattache au reversement (elles ne réduiront plus
            // les suivants). Même garde d'intégrité que les transactions.
            $adjIds = $adjustments->pluck('id');
            if ($adjIds->isNotEmpty()) {
                $attachedAdj = SettlementAdjustment::whereIn('id', $adjIds)->whereNull('settlement_id')
                    ->update(['settlement_id' => $settlement->id]);
                if ($attachedAdj !== $adjIds->count()) {
                    throw new NothingToSettleException();
                }
            }

            if ($doPayout) {
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
            ->where('direction', 'debit') // encaissements uniquement (exclut les crédits de remboursement)
            ->get(['amount', 'commission', 'created_at']);

        return $txs
            ->groupBy(fn (Transaction $t) => $t->created_at->copy()->startOfWeek()->toDateString())
            ->map(fn ($group, string $week) => [
                'week' => $week,
                'net' => round((float) $group->sum('amount'), 2), // montant plein (frais chez le payeur)
            ])
            ->sortBy('week')
            ->values()
            ->take(-8)
            ->map(fn (array $r) => ['label' => Carbon::parse($r['week'])->translatedFormat('d M'), 'net' => $r['net']])
            ->all();
    }
}
