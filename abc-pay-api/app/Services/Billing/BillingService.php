<?php

namespace App\Services\Billing;

use App\Models\Establishment;
use App\Models\FeeItem;
use App\Models\FeeSchedule;
use App\Models\FeeType;
use App\Models\Learner;
use Illuminate\Validation\ValidationException;

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

    /**
     * Modifie une ligne de barème (montant / promotion). RÉSYNC uniquement les postes
     * NON PAYÉS (amount_paid = 0) des apprenants concernés — on ne touche JAMAIS un poste
     * déjà réglé (intégrité des paiements).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateSchedule(FeeSchedule $schedule, array $data): array
    {
        $schedule->forceFill([
            'amount' => round((float) ($data['amount'] ?? $schedule->amount), 2),
            'academic_group' => array_key_exists('academic_group', $data) ? (($data['academic_group'] ?: null)) : $schedule->academic_group,
        ])->save();

        // Met à jour le montant dû des postes NON payés de ce type, pour la promotion visée.
        $this->registreLearners($schedule)->each(function (Learner $l) use ($schedule) {
            $l->feeItems()
                ->where('fee_type_id', $schedule->fee_type_id)
                ->where('amount_paid', 0)
                ->update(['amount_due' => $schedule->amount, 'currency' => $schedule->currency]);
        });

        return [
            'id' => $schedule->id,
            'fee_type' => $schedule->feeType?->name,
            'group' => $schedule->academic_group ?: 'Toutes promotions',
            'amount' => (float) $schedule->amount,
            'currency' => $schedule->currency,
        ];
    }

    /**
     * Supprime une ligne de barème. Retire les postes NON PAYÉS qu'elle a générés
     * (les postes déjà réglés sont CONSERVÉS : historique de paiement intact).
     */
    public function deleteSchedule(FeeSchedule $schedule): void
    {
        $this->registreLearners($schedule)->each(function (Learner $l) use ($schedule) {
            $l->feeItems()
                ->where('fee_type_id', $schedule->fee_type_id)
                ->where('amount_paid', 0)
                ->delete();
        });

        $schedule->delete();
    }

    /**
     * Modifie un type de frais (nom, fréquence, optionnel).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateFeeType(FeeType $type, array $data): array
    {
        if (array_key_exists('name', $data)) {
            $type->name = $data['name'];
        }
        if (array_key_exists('frequency', $data)) {
            $type->frequency = $data['frequency'];
        }
        if (array_key_exists('optional', $data)) {
            $type->is_optional = (bool) $data['optional'];
        }
        $type->save();

        return $this->presentFeeType($type);
    }

    /** Supprime un type de frais — refusé s'il est encore utilisé par une ligne de barème. */
    public function deleteFeeType(FeeType $type): void
    {
        if (FeeSchedule::where('fee_type_id', $type->id)->exists()) {
            throw ValidationException::withMessages([
                'fee_type' => "Ce type est utilisé par le barème. Supprime d'abord ses lignes de barème.",
            ]);
        }

        $type->delete();
    }

    /** Apprenants inscrits (registre) concernés par une ligne de barème (promotion). */
    private function registreLearners(FeeSchedule $schedule)
    {
        return Learner::where('establishment_id', $schedule->establishment_id)
            ->where('source', 'registre')
            ->when($schedule->academic_group, fn ($q) => $q->where('academic_group', $schedule->academic_group))
            ->get();
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

    /**
     * Inverse une imputation (remboursement) : réduit le montant payé des postes
     * (du plus récent au plus ancien) → le solde restant remonte d'autant.
     */
    public function reversePayment(Learner $learner, float $amount): void
    {
        $remaining = round($amount, 2);

        foreach ($learner->feeItems()->orderByDesc('created_at')->get() as $item) {
            if ($remaining <= 0) {
                break;
            }
            $paid = round((float) $item->amount_paid, 2);
            if ($paid <= 0) {
                continue;
            }
            $take = min($remaining, $paid);
            $item->update(['amount_paid' => round($paid - $take, 2)]);
            $remaining = round($remaining - $take, 2);
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
