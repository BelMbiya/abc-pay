<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * Isolation de scope : un jeton d'un autre périmètre (staff/admin) ne doit JAMAIS
 * être accepté sur une route payeur (sinon confusion de sujet via ids entiers partagés).
 */
class AuthScopeTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    public function test_jeton_admin_refuse_sur_route_payeur(): void
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);
        $token = app(JwtService::class)->issueAdminAccess($admin);

        $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.$token])->assertStatus(401);
    }

    public function test_jeton_staff_refuse_sur_route_payeur(): void
    {
        $user = User::factory()->create();
        $token = app(JwtService::class)->issueStaffAccess($user, 'some-establishment-id', 'direction');

        $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.$token])->assertStatus(401);
    }

    public function test_jeton_payeur_accepte_sur_route_payeur(): void
    {
        $user = User::factory()->create();
        $token = app(JwtService::class)->issueAccess($user);

        $this->getJson('/api/v1/me', ['Authorization' => 'Bearer '.$token])->assertOk();
    }
}
