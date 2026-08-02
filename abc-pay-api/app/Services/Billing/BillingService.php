<?php

namespace App\Services\Billing;

use App\Models\Establishment;
use App\Models\FeeItem;
use App\Models\FeeSchedule;
use App\Models\FeeType;
use App\Models\Learner;

/**
 * Domaine Billing — types de frais, barème et postes de frais individuels.
 * Logique hors contrôleur (DDD).
 */
class BillingService
{
    // ── Types de frais ────────────────────────────────────────────
    /** @return array<int, array<string, mixed>> */
    public function listFeeTypes(Establishment $establishment): array
    {
        return $establishment->feeTypes()->orderBy('created_at')->get()
            ->map(fn (FeeType $t) => $this->presentFeeType($t))->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function createFeeType(Establishment $establishment, array $data): array
    {
        $type = $establishment->feeTypes()->create([
            'name' => $data['name'],
            'frequency' => $data['frequency'],
            'is_optional' => $data['optional'] ?? false,
        ]);

        return $this->presentFeeType($type);
    }

    // ── Barème ────────────────────────────────────────────────────
    /** @return array<int, array<string, mixed>> */
    public function listSchedules(Establishment $establishment): array
    {
        return $establishment->feeSchedules()->with('feeType')->orderBy('created_at')->get()
            ->map(fn (FeeSchedule $s) => [
                'id' => $s->id,
                'fee_type' => $s->feeType?->name,
                'frequency' => $s->feeType?->frequency,
                'group' => $s->academic_group ?: 'Toutes promotions',
                'amount' => (float) $s->amount,
                'currency' => $s->currency,
            ])->all();
    }

    /**
     * Crée une ligne de barème et génère le poste correspondant chez les
     * apprenants concernés (mise à jour immédiate des soldes).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function createSchedule(Establishment $establishment, array $data): array
    {
        $schedule = $establishment->feeSchedules()->create([
            'fee_type_id' => $data['fee_type_id'],
            'academic_group' => ($data['academic_group'] ?? null) ?: null,
            'amount' => $data['amount'],
            'currency' => 'USD',
        ]);

        $establishment->learners()
            ->where('source', 'registre')
            ->when($schedule->academic_group, fn ($q) => $q->where('academic_group', $schedule->academic_group))
            ->get()
            ->each(fn (Learner $l) => $this->applySchedule($l, $schedule));

        return [
            'id' => $schedule->id,
            'fee_type' => $schedule->feeType?->name,
            'group' => $schedule->academic_group ?: 'Toutes promotions',
            'amount' => (float) $schedule->amount,
            'currency' => $schedule->currency,
        ];
    }

    // ── Postes de frais & solde ───────────────────────────────────
    /** Génère les postes d'un apprenant à partir du barème de son établissement. */
    public function generateFeeItemsForLearner(Learner $learner): void
    {
        FeeSchedule::where('establishment_id', $learner->establishment_id)
            ->where(fn ($q) => $q->whereNull('academic_group')->orWhere('academic_group', $learner->academic_group))
            ->with('feeType')
            ->get()
            ->each(fn (FeeSchedule $s) => $this->applySchedule($learner, $s));
    }

    /** Solde restant d'un apprenant = somme(dû - payé). */
    public function balanceFor(Learner $learner): float
    {
        return (float) $learner->feeItems()->sum('amount_due') - (float) $learner->feeItems()->sum('amount_paid');
    }

    /**
     * Impute un montant payé sur les postes de frais de l'apprenant
     * (du plus ancien au plus récent). Réduit le solde.
     */
    public function applyPayment(Learner $learner, float $amount): void
    {
        $remaining = round($amount, 2);

        foreach ($learner->feeItems()->orderBy('created_at')->get() as $item) {
            if ($remaining <= 0) {
                break;
            }
            $owed = round((float) $item->amount_due - (float) $item->amount_paid, 2);
            if ($owed <= 0) {
                continue;
            }
            $pay = min($remaining, $owed);
            $item->update(['amount_paid' => round((float) $item->amount_paid + $pay, 2)]);
            $remaining = round($remaining - $pay, 2);
        }
    }

    private function applySchedule(Learner $learner, FeeSchedule $schedule): void
    {
        $learner->feeItems()->firstOrCreate(
            ['fee_type_id' => $schedule->fee_type_id, 'label' => $schedule->feeType?->name ?? 'Frais'],
            [
                'establishment_id' => $learner->establishment_id,
                'amount_due' => $schedule->amount,
                'amount_paid' => 0,
                'currency' => $schedule->currency,
            ],
        );
    }

    /** @return array<string, mixed> */
    private function presentFeeType(FeeType $type): array
    {
        return ['id' => $type->id, 'name' => $type->name, 'frequency' => $type->frequency, 'optional' => $type->is_optional];
    }
}
