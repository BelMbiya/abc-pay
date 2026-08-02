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

class TransactionViewsTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function pay(Establishment $e, float $amount = 250): void
    {
        $this->postJson('/api/v1/payments', [
            'establishment_id' => $e->id,
            'student_name' => 'Élève X',
            'student_matricule' => 'M-'.$amount,
            'fee_type' => 'Minerval',
            'channel' => 'mpesa',
            'amount' => $amount,
        ])->assertCreated();
    }

    private function staffHeaders(Establishment $e): array
    {
        $user = User::factory()->create();
        EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $user->id, 'role' => 'direction']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueStaffAccess($user, $e->id, 'direction')];
    }

    private function adminHeaders(): array
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
    }

    public function test_etablissement_ne_voit_que_ses_paiements(): void
    {
        $mine = Establishment::factory()->create(['commission_rate' => 0.02]);
        $other = Establishment::factory()->create();
        $this->pay($mine, 250);
        $this->pay($other, 100);

        $res = $this->getJson('/api/v1/staff/transactions', $this->staffHeaders($mine))
            ->assertOk()
            ->assertJsonCount(1, 'data.transactions');

        // Synthèse : volume 250, commission 5 (2 %), net 245.
        $this->assertSame(250.0, (float) $res->json('data.summary.volume'));
        $this->assertSame(5.0, (float) $res->json('data.summary.commission'));
        $this->assertSame(245.0, (float) $res->json('data.summary.net'));
    }

    public function test_admin_voit_toutes_les_transactions_et_la_synthese(): void
    {
        $a = Establishment::factory()->create(['commission_rate' => 0.02]);
        $b = Establishment::factory()->create(['commission_rate' => 0.02]);
        $this->pay($a, 250);
        $this->pay($b, 100);

        $res = $this->getJson('/api/v1/admin/transactions', $this->adminHeaders())
            ->assertOk()
            ->assertJsonCount(2, 'data.transactions');

        $this->assertSame(350.0, (float) $res->json('data.summary.volume'));
        $this->assertSame(7.0, (float) $res->json('data.summary.commission')); // 5 + 2
    }

    public function test_transactions_staff_exigent_auth(): void
    {
        $this->getJson('/api/v1/staff/transactions')->assertStatus(401);
        $this->getJson('/api/v1/admin/transactions')->assertStatus(401);
    }
}
