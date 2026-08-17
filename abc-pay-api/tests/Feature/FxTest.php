<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Services\Identity\JwtService;
use App\Services\Platform\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class FxTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function adminHeaders(): array
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
    }

    private function pay(Establishment $e, float $amount): void
    {
        $this->postJson('/api/v1/payments', [
            'establishment_id' => $e->id, 'student_name' => 'X', 'student_matricule' => 'M-'.$e->id.$amount,
            'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => $amount,
        ])->assertCreated();
    }

    public function test_conversion_usd_cdf(): void
    {
        $s = app(SettingsService::class);
        $s->setUsdCdfRate(2500);

        $this->assertSame(2500.0, $s->convert(1, 'USD', 'CDF'));
        $this->assertSame(2.0, $s->convert(5000, 'CDF', 'USD'));
        $this->assertSame(10.0, $s->convert(10, 'USD', 'USD'));
    }

    public function test_dashboard_plateforme_agrege_en_devise_de_base(): void
    {
        $this->patchJson('/api/v1/admin/settings', ['currency' => 'USD', 'usd_cdf_rate' => 2000], $this->adminHeaders())->assertOk();

        $usd = Establishment::factory()->create(['currency' => 'USD', 'commission_rate' => 0]); // presets [150,250]
        // Barème à l'échelle CDF (sinon le plafond « montant ≤ frais » refuse 4000 CDF).
        $cdf = Establishment::factory()->create(['currency' => 'CDF', 'commission_rate' => 0, 'presets' => [10000, 20000]]);
        $this->pay($usd, 100);      // 100 USD
        $this->pay($cdf, 4000);     // 4000 CDF = 2 USD (taux 2000)

        // Volume plateforme en USD = 100 + 2 = 102.
        $res = $this->getJson('/api/v1/admin/dashboard', $this->adminHeaders())->assertOk();
        $this->assertSame('USD', $res->json('data.base_currency'));
        $this->assertSame(102.0, (float) $res->json('data.kpis.volume'));
    }

    public function test_plafond_compare_en_devise_de_base(): void
    {
        $this->patchJson('/api/v1/admin/settings', ['usd_cdf_rate' => 2800, 'transfer_cap' => 10000], $this->adminHeaders())->assertOk();
        $user = \App\Models\User::factory()->create();
        $auth = ['Authorization' => 'Bearer '.app(\App\Services\Identity\JwtService::class)->issueAccess($user)];

        // 20 000 CDF ≈ 7 USD < plafond 10 000 USD → succès.
        $ok = $this->postJson('/api/v1/transactions', ['type' => 'send', 'amount' => 20000, 'currency' => 'CDF', 'channel' => 'mpesa'], $auth)->assertCreated();
        $this->assertSame('confirmee', $ok->json('data.transaction.status'));

        // 20 000 USD > plafond → échec.
        $ko = $this->postJson('/api/v1/transactions', ['type' => 'send', 'amount' => 20000, 'currency' => 'USD', 'channel' => 'mpesa'], $auth)->assertCreated();
        $this->assertSame('echouee', $ko->json('data.transaction.status'));
    }

    public function test_reglages_exposent_le_taux(): void
    {
        $this->patchJson('/api/v1/admin/settings', ['usd_cdf_rate' => 3000], $this->adminHeaders())->assertOk();
        $this->getJson('/api/v1/settings')->assertOk()->assertJsonPath('data.usd_cdf_rate', 3000);
    }
}
