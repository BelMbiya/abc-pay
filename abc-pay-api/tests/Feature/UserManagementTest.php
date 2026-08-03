<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class UserManagementTest extends TestCase
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

    public function test_admin_cree_un_compte(): void
    {
        $res = $this->postJson('/api/v1/admin/users', [
            'phone' => '+243810009999', 'name' => 'Nouveau Client',
        ], $this->adminHeaders())->assertCreated();

        $this->assertSame('+243810009999', $res->json('data.phone'));
        $this->assertNotNull(User::where('phone', '+243810009999')->first());
    }

    public function test_admin_liste_les_utilisateurs(): void
    {
        User::factory()->count(3)->create();
        $res = $this->getJson('/api/v1/admin/users', $this->adminHeaders())->assertOk();
        $this->assertGreaterThanOrEqual(3, count($res->json('data')));
    }

    public function test_admin_bloque_un_compte_puis_l_acces_est_refuse(): void
    {
        $user = User::factory()->create();
        $this->postJson("/api/v1/admin/users/{$user->id}/block", ['reason' => 'Activité suspecte'], $this->adminHeaders())->assertOk();

        $this->assertTrue((bool) $user->fresh()->is_blocked);
        // Accès gelé : 403 sur une route authentifiée.
        $this->getJson('/api/v1/me', $this->auth($user))->assertStatus(403);

        // Déblocage → l'accès redevient possible.
        $this->postJson("/api/v1/admin/users/{$user->id}/unblock", [], $this->adminHeaders())->assertOk();
        $this->getJson('/api/v1/me', $this->auth($user))->assertOk();
    }

    public function test_deconnexion_forcee_invalide_les_jetons_anterieurs(): void
    {
        $user = User::factory()->create();
        $headers = $this->auth($user); // jeton émis maintenant
        $this->getJson('/api/v1/me', $headers)->assertOk();

        // Révocation dans le futur → le jeton (émis avant) est refusé.
        $user->sessions_revoked_at = now()->addMinute();
        $user->save();
        $this->getJson('/api/v1/me', $headers)->assertStatus(401);
    }

    public function test_suppression_refusee_si_historique(): void
    {
        $user = User::factory()->create();
        Transaction::create([
            'type' => 'send', 'direction' => 'debit', 'user_id' => $user->id, 'channel' => 'mpesa',
            'amount' => 10, 'service_fee' => 0, 'commission' => 0, 'total' => 10, 'currency' => 'USD', 'status' => 'confirmee',
        ]);

        $this->deleteJson("/api/v1/admin/users/{$user->id}", [], $this->adminHeaders())->assertStatus(422);
        $this->assertNotNull(User::find($user->id));
    }

    public function test_suppression_ok_sans_historique(): void
    {
        $user = User::factory()->create();
        $this->deleteJson("/api/v1/admin/users/{$user->id}", [], $this->adminHeaders())->assertOk();
        $this->assertNull(User::find($user->id));
    }
}
