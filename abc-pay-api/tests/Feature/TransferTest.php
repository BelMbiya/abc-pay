<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class TransferTest extends TestCase
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

    public function test_envoi_p2p_est_trace_dans_l_historique(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 20, 'channel' => 'mpesa',
            'counterparty_name' => 'Josué M.', 'counterparty_phone' => '+243810000002',
        ], $this->auth($user))->assertCreated()->assertJsonPath('data.transaction.type', 'send');

        $res = $this->getJson('/api/v1/transactions', $this->auth($user))->assertOk();
        $this->assertSame('send', $res->json('data.0.type'));
        $this->assertSame('Josué M.', $res->json('data.0.counterparty_name'));
    }

    public function test_paiement_service_est_trace(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/transactions', [
            'type' => 'service', 'amount' => 15, 'channel' => 'airtel', 'label' => 'SNEL · Électricité', 'reference' => 'CPT-12',
        ], $this->auth($user))->assertCreated();

        $res = $this->getJson('/api/v1/transactions', $this->auth($user))->assertOk();
        $this->assertSame('service', $res->json('data.0.type'));
        $this->assertSame('SNEL · Électricité', $res->json('data.0.label'));
    }

    public function test_envoi_vers_un_utilisateur_cree_le_recu_miroir(): void
    {
        $sender = User::factory()->create(['name' => 'Grace', 'phone' => '+243810000010']);
        $recipient = User::factory()->create(['name' => 'Josué', 'phone' => '+243810000011']);

        // Grace envoie 30 $ à Josué.
        $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 30, 'channel' => 'mpesa',
            'counterparty_name' => 'Josué', 'counterparty_phone' => '+243810000011',
        ], $this->auth($sender))->assertCreated();

        // Grace voit un ENVOI (débit) vers Josué.
        $g = $this->getJson('/api/v1/transactions', $this->auth($sender))->assertOk();
        $this->assertSame('send', $g->json('data.0.type'));
        $this->assertSame('Josué', $g->json('data.0.counterparty_name'));

        // Josué voit un REÇU (crédit) venant de Grace.
        $j = $this->getJson('/api/v1/transactions', $this->auth($recipient))->assertOk();
        $this->assertSame('receive', $j->json('data.0.type'));
        $this->assertSame('credit', $j->json('data.0.direction'));
        $this->assertSame('Grace', $j->json('data.0.counterparty_name'));
    }

    public function test_type_invalide_refuse(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/transactions', ['type' => 'hack', 'amount' => 10, 'channel' => 'mpesa'], $this->auth($user))
            ->assertStatus(422);
    }

    public function test_transaction_exige_authentification(): void
    {
        $this->postJson('/api/v1/transactions', ['type' => 'send', 'amount' => 10, 'channel' => 'mpesa'])->assertStatus(401);
    }
}
