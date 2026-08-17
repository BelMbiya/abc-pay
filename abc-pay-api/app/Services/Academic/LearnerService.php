<?php

namespace App\Services\Academic;

use App\Models\Establishment;
use App\Models\Learner;
use App\Models\Transaction;
use App\Services\Billing\BillingService;
use Illuminate\Support\Facades\DB;
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
     * RELEVÉ DE COMPTE d'un apprenant : postes de frais (dû / payé / solde) +
     * historique des paiements confirmés + totaux. Read-model destiné à l'espace
     * établissement (affichage + impression / export PDF côté client).
     *
     * @return array<string, mixed>
     */
    public function statement(Learner $learner): array
    {
        $learner->loadMissing('establishment', 'feeItems');

        $fees = $learner->feeItems
            ->sortBy('created_at')
            ->map(fn ($item) => [
                'label' => $item->label,
                'due' => (float) $item->amount_due,
                'paid' => (float) $item->amount_paid,
                'balance' => round((float) $item->amount_due - (float) $item->amount_paid, 2),
            ])
            ->values()
            ->all();

        $totalDue = round((float) $learner->feeItems->sum('amount_due'), 2);
        $totalPaid = round((float) $learner->feeItems->sum('amount_paid'), 2);

        $payments = Transaction::with('receipt')
            ->where('learner_id', $learner->id)
            ->where('status', 'confirmee')
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Transaction $t) => [
                'date' => $t->created_at?->toDateString(),
                'fee_type' => $t->fee_type,
                'amount' => (float) $t->amount,
                'receipt' => $t->receipt?->number,
                'reference' => $t->reference,
            ])
            ->all();

        $name = trim(implode(' ', array_filter([$learner->last_name, $learner->first_name, $learner->middle_name])));

        return [
            'learner' => [
                'name' => $name !== '' ? $name : ($learner->matricule ?? '—'),
                'matricule' => $learner->matricule,
                'academic_group' => $learner->academic_group,
                'parent_name' => $learner->parent_name,
                'parent_phone' => $learner->parent_phone,
                'abcpay_ref' => $learner->abcpay_ref,
                'status' => $learner->status,
            ],
            'establishment' => [
                'name' => $learner->establishment?->name,
                'city' => $learner->establishment?->city,
                'currency' => $learner->establishment?->currency ?: 'USD',
            ],
            'fees' => $fees,
            'payments' => $payments,
            'totals' => [
                'due' => $totalDue,
                'paid' => $totalPaid,
                'balance' => round($totalDue - $totalPaid, 2),
            ],
            'generated_at' => now()->toIso8601String(),
        ];
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

    /**
     * Import / RÉCONCILIATION en masse par matricule : crée les nouveaux apprenants,
     * met à jour (réconcilie) ceux qui existent déjà, et (re)génère leurs postes de frais.
     * Renvoie un bilan explicite : créés / réconciliés / erreurs (ligne + motif).
     *
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{created: int, reconciled: int, errors: array<int, array{line: int, message: string}>}
     */
    public function import(Establishment $establishment, array $rows): array
    {
        // L4 : import atomique — un échec fatal en cours de boucle ne laisse pas d'état partiel.
        return DB::transaction(fn () => $this->importRows($establishment, $rows));
    }

    /**
     * @param  array<int, array<string, mixed>>  $rows
     * @return array{created: int, reconciled: int, errors: array<int, array{line: int, message: string}>}
     */
    private function importRows(Establishment $establishment, array $rows): array
    {
        $created = 0;
        $reconciled = 0;
        $errors = [];
        $seen = [];

        foreach ($rows as $i => $row) {
            $line = $i + 2; // +1 en-tête, +1 base 1
            $matricule = trim((string) ($row['matricule'] ?? ''));
            $last = trim((string) ($row['last_name'] ?? ''));
            $first = trim((string) ($row['first_name'] ?? ''));

            if ($matricule === '' || $last === '' || $first === '') {
                $errors[] = ['line' => $line, 'message' => 'Nom, prénom et matricule sont obligatoires.'];
                continue;
            }
            if (isset($seen[$matricule])) {
                $errors[] = ['line' => $line, 'message' => "Matricule « {$matricule} » en double dans le fichier."];
                continue;
            }
            $seen[$matricule] = true;

            $rel = in_array($row['parent_relation'] ?? null, ['parent', 'tuteur', 'proche'], true) ? $row['parent_relation'] : null;
            $attrs = [
                'last_name' => $last,
                'middle_name' => ($row['middle_name'] ?? null) ?: null,
                'first_name' => $first,
                'academic_group' => ($row['academic_group'] ?? null) ?: null,
                'parent_name' => ($row['parent_name'] ?? null) ?: null,
                'parent_phone' => ($row['parent_phone'] ?? null) ?: null,
                'parent_relation' => $rel,
            ];

            $existing = $establishment->learners()->where('matricule', $matricule)->first();
            if ($existing) {
                // Réconciliation : on aligne l'identité et on bascule au registre (les
                // paiements déjà reçus pour ce matricule restent imputés → solde à jour).
                $existing->update($attrs + ['source' => 'registre']);
                $this->billing->generateFeeItemsForLearner($existing);
                $reconciled++;
            } else {
                $learner = $establishment->learners()->create($attrs + [
                    'abcpay_ref' => 'ABCP-'.Str::upper(Str::random(8)),
                    'matricule' => $matricule,
                    'status' => 'actif',
                    'source' => 'registre',
                ]);
                $this->billing->generateFeeItemsForLearner($learner);
                $created++;
            }
        }

        return ['created' => $created, 'reconciled' => $reconciled, 'errors' => $errors];
    }

    /** @return array<string, mixed> */
    private function present(Learner $l): array
    {
        $due = (float) $l->feeItems->sum('amount_due');    // attendu
        $paid = (float) $l->feeItems->sum('amount_paid');  // encaissé

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
            // Réconciliation par matricule : attendu / encaissé / restant.
            'due_total' => round($due, 2),
            'paid_total' => round($paid, 2),
            'balance' => round($due - $paid, 2),
        ];
    }
}
