<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\FeeItem;
use App\Models\FeeType;
use App\Models\Learner;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * #10 — Relevé de compte d'un apprenant (bouton « État de compte »).
 * Le staff obtient postes dû/payé/solde + historique des paiements + totaux,
 * strictement pour les apprenants de SON établissement.
 */
class LearnerStatementTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function staffAuth(User $u, string $establishmentId): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueStaffAccess($u, $establishmentId, 'direction')];
    }

    public function test_releve_liste_frais_paiements_et_totaux(): void
    {
        $e = Establishment::factory()->create(['billing_mode' => 'fee_management', 'currency' => 'USD']);
        $staff = User::factory()->create();
        $learner = Learner::factory()->create([
            'establishment_id' => $e->id, 'source' => 'registre', 'matricule' => 'M-1',
            'last_name' => 'Kabeya', 'first_name' => 'Grace', 'middle_name' => null,
        ]);
        $type = FeeType::factory()->create(['establishment_id' => $e->id]);
        FeeItem::create([
            'establishment_id' => $e->id, 'learner_id' => $learner->id, 'fee_type_id' => $type->id,
            'label' => 'Minerval', 'amount_due' => 500, 'amount_paid' => 200,
        ]);
        Transaction::create([
            'establishment_id' => $e->id, 'learner_id' => $learner->id, 'student_name' => 'Grace',
            'student_matricule' => 'M-1', 'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => 200,
            'service_fee' => 0, 'commission' => 4, 'total' => 200, 'currency' => 'USD',
            'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $res = $this->getJson("/api/v1/staff/learners/{$learner->id}/statement", $this->staffAuth($staff, $e->id))
            ->assertOk()
            ->assertJsonPath('data.learner.name', 'Kabeya Grace')
            ->assertJsonPath('data.fees.0.label', 'Minerval')
            ->assertJsonCount(1, 'data.payments');

        $this->assertSame(500.0, (float) $res->json('data.totals.due'));
        $this->assertSame(200.0, (float) $res->json('data.totals.paid'));
        $this->assertSame(300.0, (float) $res->json('data.totals.balance'));
        $this->assertSame(200.0, (float) $res->json('data.payments.0.amount'));
    }

    public function test_releve_hors_etablissement_est_interdit(): void
    {
        $mine = Establishment::factory()->create();
        $other = Establishment::factory()->create();
        $learner = Learner::factory()->create(['establishment_id' => $mine->id]);
        $intruder = User::factory()->create();

        // Un staff de « other » ne peut pas lire le relevé d'un apprenant de « mine ».
        $this->getJson("/api/v1/staff/learners/{$learner->id}/statement", $this->staffAuth($intruder, $other->id))
            ->assertStatus(403);
    }
}
