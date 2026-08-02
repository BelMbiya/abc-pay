<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class RefreshTokenTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function jwt(): JwtService
    {
        return app(JwtService::class);
    }

    public function test_refresh_payeur_reemet_un_acces_valide(): void
    {
        $user = User::factory()->create(['phone' => '+243810000009']);
        $refresh = $this->jwt()->issueRefresh($user);

        $res = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh])
            ->assertOk()
            ->assertJsonPath('data.scope', 'payer')
            ->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'expires_in']]);

        // Le nouvel accès est accepté par une route payeur.
        $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.$res->json('data.access_token')])->assertOk();
    }

    public function test_refresh_staff_reemet_un_acces_scope(): void
    {
        $e = Establishment::factory()->create();
        $user = User::factory()->create();
        EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $user->id, 'role' => 'direction']);
        $refresh = $this->jwt()->issueStaffRefresh($user, $e->id, 'direction');

        $res = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh])
            ->assertOk()
            ->assertJsonPath('data.scope', 'staff');

        $this->getJson('/api/v1/staff/fee-types', ['Authorization' => 'Bearer '.$res->json('data.access_token')])->assertOk();
    }

    public function test_refresh_admin_reemet_un_acces_admin(): void
    {
        $admin = Admin::create(['name' => 'HQ', 'email' => 'hq@abcpay.cd', 'password' => 'secret123', 'role' => 'super_admin']);
        $refresh = $this->jwt()->issueAdminRefresh($admin);

        $res = $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $refresh])
            ->assertOk()
            ->assertJsonPath('data.scope', 'admin');

        $this->getJson('/api/v1/admin/establishments', ['Authorization' => 'Bearer '.$res->json('data.access_token')])->assertOk();
    }

    public function test_un_access_token_ne_peut_pas_servir_de_refresh(): void
    {
        $user = User::factory()->create();
        $access = $this->jwt()->issueAccess($user);

        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => $access])->assertStatus(401);
    }

    public function test_refresh_illisible_renvoie_401(): void
    {
        $this->postJson('/api/v1/auth/refresh', ['refresh_token' => 'pas-un-jwt'])->assertStatus(401);
    }
}
