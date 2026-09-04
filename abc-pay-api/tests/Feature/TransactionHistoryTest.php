<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class TransactionHistoryTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function auth(User $user): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($user)];
    }

    private function payload(Establishment $e, array $overrides = []): array
    {
        return array_merge([
            'establishment_id' => $e->id,
            'student_name' => 'Ilunga Grace',
            'student_matricule' => 'ISC-2026-0001',
            'fee_type' => 'Minerval',
            'channel' => 'mpesa',
            'amount' => 250,
        ], $overrides);
    }

    public function test_historique_exige_authentification(): void
    {
        $this->getJson('/api/v1/transactions')->assertStatus(401);
    }

    public function test_paiement_connecte_est_associe_et_apparait_dans_l_historique(): void
    {
        $e = Establishment::factory()->create();
        $user = User::factory()->create();

        // Le front envoie le Bearer sur le POST : la transaction est rattachée au payeur.
        $this->postJson('/api/v1/payments', $this->payload($e), $this->auth($user))->assertCreated();
        $this->assertDatabaseHas('transactions', ['user_id' => $user->id]);

        $res = $this->getJson('/api/v1/transactions', $this->auth($user))
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fee_type', 'Minerval');

        $this->assertNotNull($res->json('data.0.receipt_number'));
        $this->assertSame(255.0, (float) $res->json('data.0.total')); // payeur : montant + frais (250 + 5)
    }

    public function test_un_payeur_ne_voit_que_ses_propres_transactions(): void
    {
        $e = Establishment::factory()->create();
        $me = User::factory()->create();
        $other = User::factory()->create();

        $this->postJson('/api/v1/payments', $this->payload($e), $this->auth($me))->assertCreated();
        $this->postJson('/api/v1/payments', $this->payload($e), $this->auth($other))->assertCreated();

        $this->getJson('/api/v1/transactions', $this->auth($me))
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_paiement_anonyme_reste_possible_sans_user(): void
    {
        $e = Establishment::factory()->create();

        $this->postJson('/api/v1/payments', $this->payload($e))->assertCreated();
        $this->assertDatabaseHas('transactions', ['user_id' => null]);
    }
}
