<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class AdminRbacTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function tokenFor(string $role, array $attrs = []): array
    {
        $admin = Admin::create([
            'name' => ucfirst($role), 'email' => $role.'@abcpay.cd', 'password' => 'secret123', 'role' => $role,
        ]);
        if ($attrs) {
            $admin->forceFill($attrs)->save();
        }

        return [$admin, ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)]];
    }

    public function test_finance_accede_aux_remboursements_mais_pas_au_kyc(): void
    {
        [, $h] = $this->tokenFor('finance');
        $this->getJson('/api/v1/admin/refunds', $h)->assertOk();
        $this->getJson('/api/v1/admin/transactions', $h)->assertOk();
        $this->getJson('/api/v1/admin/kyc', $h)->assertStatus(403);
        $this->getJson('/api/v1/admin/users', $h)->assertStatus(403);
    }

    public function test_compliance_accede_au_kyc_mais_pas_aux_remboursements(): void
    {
        [, $h] = $this->tokenFor('compliance');
        $this->getJson('/api/v1/admin/kyc', $h)->assertOk();
        $this->getJson('/api/v1/admin/fraud', $h)->assertOk();
        $this->getJson('/api/v1/admin/refunds', $h)->assertStatus(403);
    }

    public function test_seul_super_admin_gere_l_equipe(): void
    {
        [, $support] = $this->tokenFor('support');
        $this->getJson('/api/v1/admin/admins', $support)->assertStatus(403);

        [, $su] = $this->tokenFor('super_admin');
        $this->getJson('/api/v1/admin/admins', $su)->assertOk();
    }

    public function test_super_admin_cree_un_admin_avec_mdp_a_changer(): void
    {
        [, $su] = $this->tokenFor('super_admin');
        $this->postJson('/api/v1/admin/admins', [
            'name' => 'Nouvel Op', 'email' => 'op@abcpay.cd', 'role' => 'support', 'password' => 'temp12345',
        ], $su)->assertCreated()->assertJsonPath('data.must_change_password', true);

        $created = Admin::where('email', 'op@abcpay.cd')->first();
        $this->assertTrue($created->must_change_password);
        $this->assertSame('support', $created->role);
    }

    public function test_nouvel_admin_doit_changer_son_mdp_avant_tout(): void
    {
        [$admin, $h] = $this->tokenFor('finance', ['must_change_password' => true]);
        // gaté partout sauf /admin/password
        $this->getJson('/api/v1/admin/refunds', $h)->assertStatus(403);
        $this->postJson('/api/v1/admin/password', ['current_password' => 'secret123', 'new_password' => 'newsecret9'], $h)->assertOk();
        // après changement → accès
        $this->getJson('/api/v1/admin/refunds', $h)->assertOk();
    }

    public function test_impossible_de_retirer_le_dernier_super_admin(): void
    {
        [$su, $h] = $this->tokenFor('super_admin');
        // se rétrograder soi-même → refusé
        $this->patchJson('/api/v1/admin/admins/'.$su->id, ['role' => 'support'], $h)->assertStatus(422);
        // supprimer le dernier super-admin (soi-même) → refusé
        $this->deleteJson('/api/v1/admin/admins/'.$su->id, [], $h)->assertStatus(422);
    }
}
