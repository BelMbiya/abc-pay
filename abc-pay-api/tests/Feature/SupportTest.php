<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\SupportTicket;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class SupportTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function auth(User $u): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($u)];
    }

    private function adminHeaders(): array
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
    }

    public function test_utilisateur_ouvre_un_ticket(): void
    {
        $user = User::factory()->create();
        $res = $this->postJson('/api/v1/support/tickets', [
            'category' => 'dispute', 'subject' => 'Débit non reçu', 'message' => 'Mon envoi n\'est jamais arrivé.', 'tx_reference' => 'RC-2026-00001',
        ], $this->auth($user))->assertCreated();

        $this->assertSame('open', $res->json('data.status'));
        $this->assertStringStartsWith('TCK-', $res->json('data.reference'));
        $this->assertFalse((bool) $user->fresh()->is_blocked); // un litige ne gèle pas le compte
    }

    public function test_signalement_compte_usurpe_gele_le_compte(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/support/tickets', [
            'category' => 'compromised', 'subject' => 'Compte piraté', 'message' => 'Je vois des opérations que je n\'ai pas faites.',
        ], $this->auth($user))->assertCreated();

        $fresh = $user->fresh();
        $this->assertTrue((bool) $fresh->is_blocked);
        $this->assertNotNull($fresh->sessions_revoked_at);
    }

    public function test_bouton_bloquer_mon_compte(): void
    {
        $user = User::factory()->create();
        $res = $this->postJson('/api/v1/me/lock', [], $this->auth($user))->assertCreated();

        $this->assertSame('compromised', $res->json('data.category'));
        $fresh = $user->fresh();
        $this->assertTrue((bool) $fresh->is_blocked);
        $this->assertNotNull($fresh->sessions_revoked_at);
        // Le titulaire est désormais gelé : accès refusé.
        $this->getJson('/api/v1/me', $this->auth($user))->assertStatus(403);
    }

    public function test_admin_liste_et_resout(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/support/tickets', ['category' => 'access', 'subject' => 'Accès', 'message' => 'Problème de connexion.'], $this->auth($user))->assertCreated();
        $ticket = SupportTicket::first();

        $list = $this->getJson('/api/v1/admin/support', $this->adminHeaders())->assertOk();
        $this->assertGreaterThanOrEqual(1, $list->json('data.open'));

        $res = $this->postJson("/api/v1/admin/support/{$ticket->id}/respond", ['response' => 'Réinitialisation effectuée.', 'status' => 'resolved'], $this->adminHeaders())->assertOk();
        $this->assertSame('resolved', $res->json('data.status'));
        $this->assertSame('Réinitialisation effectuée.', $res->json('data.admin_response'));
        $this->assertNotNull($ticket->fresh()->resolved_at);
    }
}
