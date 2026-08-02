<?php

namespace App\Services\Academic;

use App\Models\Establishment;
use App\Models\Learner;
use App\Services\Billing\BillingService;
use Illuminate\Support\Str;

/**
 * Domaine Academic — gestion des apprenants d'un établissement.
 * Le solde est calculé à partir des postes de frais (module Billing).
 */
class LearnerService
{
    public function __construct(private readonly BillingService $billing) {}

    /** @return array<int, array<string, mixed>> */
    public function listForEstablishment(Establishment $establishment): array
    {
        return $establishment->learners()
            ->with('feeItems')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Learner $l) => $this->present($l))
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Establishment $establishment, array $data): array
    {
        $learner = $establishment->learners()->create([
            'abcpay_ref' => 'ABCP-'.Str::upper(Str::random(8)),
            'last_name' => $data['last_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'first_name' => $data['first_name'],
            'academic_group' => $data['academic_group'] ?? null,
            'matricule' => $data['matricule'] ?? null,
            'parent_name' => $data['parent_name'] ?? null,
            'parent_phone' => $data['parent_phone'] ?? null,
            'parent_relation' => $data['parent_relation'] ?? null,
            'status' => 'actif',
            'source' => 'registre',
        ]);

        // Génère les postes de frais depuis le barème → solde immédiat.
        $this->billing->generateFeeItemsForLearner($learner);

        return $this->present($learner->load('feeItems'));
    }

    /** @return array<string, mixed> */
    private function present(Learner $l): array
    {
        $balance = (float) $l->feeItems->sum('amount_due') - (float) $l->feeItems->sum('amount_paid');

        return [
            'id' => $l->id,
            'ref' => $l->abcpay_ref,
            'name' => trim("{$l->last_name} {$l->middle_name} {$l->first_name}"),
            'group' => $l->academic_group,
            'matricule' => $l->matricule,
            'parent_name' => $l->parent_name,
            'parent_phone' => $l->parent_phone,
            'parent_relation' => $l->parent_relation,
            'status' => $l->status,
            'source' => $l->source,
            'balance' => round($balance, 2),
        ];
    }
}
