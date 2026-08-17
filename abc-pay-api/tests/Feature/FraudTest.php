<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\FraudFlag;
use App\Models\User;
use App\Services\Identity\JwtService;
use App\Services\Platform\SettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class FraudTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
        // Plafond large pour que les gros montants réussissent (on teste la fraude, pas le plafond).
        app(SettingsService::class)->setTransferCap(1_000_000);
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

    public function test_gros_montant_cree_un_signalement(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 600, 'currency' => 'USD', 'channel' => 'mpesa', 'counterparty_phone' => '+243810000010',
        ], $this->auth($user))->assertCreated();

        $flag = FraudFlag::first();
        $this->assertNotNull($flag);
        // Le moteur enrichi peut remonter un signal plus fort (nouveau bénéficiaire,
        // gros montant, compte neuf…) : on vérifie qu'un signalement pertinent est ouvert.
        $this->assertContains($flag->rule, ['large_amount', 'new_beneficiary', 'new_account_high']);
        $this->assertGreaterThanOrEqual(55, $flag->score);
        $this->assertSame('open', $flag->status);

        $res = $this->getJson('/api/v1/admin/fraud', $this->adminHeaders())->assertOk();
        $this->assertGreaterThanOrEqual(1, $res->json('data.open'));
    }

    public function test_admin_bloque_le_compte_et_les_operations_sont_refusees(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 600, 'currency' => 'USD', 'channel' => 'mpesa', 'counterparty_phone' => '+243810000011',
        ], $this->auth($user))->assertCreated();

        $flag = FraudFlag::first();
        $this->postJson("/api/v1/admin/fraud/{$flag->id}/block", [], $this->adminHeaders())->assertOk();

        $this->assertTrue((bool) $user->fresh()->is_blocked);

        // Le compte bloqué est gelé DÈS le middleware : 403 sur toute route authentifiée
        // (défense en profondeur : TransferService refuse aussi en interne).
        $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 10, 'currency' => 'USD', 'channel' => 'mpesa', 'counterparty_phone' => '+243810000012',
        ], $this->auth($user))->assertStatus(403)->assertJsonPath('error.code', 'account_blocked');
    }

    public function test_admin_peut_ecarter_un_signalement(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 600, 'currency' => 'USD', 'channel' => 'mpesa', 'counterparty_phone' => '+243810000013',
        ], $this->auth($user))->assertCreated();

        $flag = FraudFlag::first();
        $this->postJson("/api/v1/admin/fraud/{$flag->id}/dismiss", [], $this->adminHeaders())->assertOk();

        $this->assertSame('dismissed', $flag->fresh()->status);
        $this->assertFalse((bool) $user->fresh()->is_blocked);
    }
}
