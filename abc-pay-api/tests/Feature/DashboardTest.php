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

class DashboardTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function pay(Establishment $e, float $amount, string $channel = 'mpesa'): void
    {
        $this->postJson('/api/v1/payments', [
            'establishment_id' => $e->id, 'student_name' => 'X', 'student_matricule' => 'M-'.$amount.$channel,
            'fee_type' => 'Minerval', 'channel' => $channel, 'amount' => $amount,
        ])->assertCreated();
    }

    public function test_dashboard_etablissement_agrege_les_donnees(): void
    {
        $e = Establishment::factory()->create(['commission_rate' => 0.02]);
        $user = User::factory()->create();
        EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $user->id, 'role' => 'direction']);
        $this->pay($e, 250, 'mpesa');
        $this->pay($e, 100, 'airtel');

        $headers = ['Authorization' => 'Bearer '.app(JwtService::class)->issueStaffAccess($user, $e->id, 'direction')];
        $res = $this->getJson('/api/v1/staff/dashboard', $headers)->assertOk();

        $this->assertSame(350.0, (float) $res->json('data.kpis.collected'));
        $this->assertNotEmpty($res->json('data.weekly'));
        $this->assertNotEmpty($res->json('data.by_channel'));
    }

    public function test_dashboard_admin_agrege_la_plateforme(): void
    {
        $a = Establishment::factory()->create();
        $b = Establishment::factory()->create();
        $this->pay($a, 250);
        $this->pay($b, 150);

        $admin = Admin::create(['name' => 'HQ', 'email' => 'hq@abcpay.cd', 'password' => 'secret123', 'role' => 'super_admin']);
        $headers = ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
        $res = $this->getJson('/api/v1/admin/dashboard', $headers)->assertOk();

        $this->assertSame(400.0, (float) $res->json('data.kpis.volume'));
        $this->assertSame(2, $res->json('data.kpis.transactions'));
        $this->assertNotEmpty($res->json('data.top_establishments'));
    }

    public function test_dashboards_exigent_authentification(): void
    {
        $this->getJson('/api/v1/staff/dashboard')->assertStatus(401);
        $this->getJson('/api/v1/admin/dashboard')->assertStatus(401);
    }
}
