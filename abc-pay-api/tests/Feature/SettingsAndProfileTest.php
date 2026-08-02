<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class SettingsAndProfileTest extends TestCase
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

    public function test_devise_par_defaut_usd_et_modifiable(): void
    {
        $this->getJson('/api/v1/settings')->assertOk()->assertJsonPath('data.currency', 'USD');

        $this->patchJson('/api/v1/admin/settings', ['currency' => 'CDF'], $this->adminHeaders())
            ->assertOk()->assertJsonPath('data.currency', 'CDF');

        $this->getJson('/api/v1/settings')->assertJsonPath('data.currency', 'CDF');
    }

    public function test_devise_plateforme_sur_les_transferts(): void
    {
        $this->patchJson('/api/v1/admin/settings', ['currency' => 'CDF'], $this->adminHeaders())->assertOk();
        $user = \App\Models\User::factory()->create();
        $auth = ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($user)];

        // Un envoi sans devise explicite prend la devise plateforme.
        $this->postJson('/api/v1/transactions', ['type' => 'send', 'amount' => 50, 'channel' => 'mpesa'], $auth)->assertCreated();
        $this->assertDatabaseHas('transactions', ['user_id' => $user->id, 'currency' => 'CDF']);
    }

    public function test_tuition_utilise_la_devise_de_l_etablissement(): void
    {
        // La plateforme est en USD mais l'établissement facture en CDF.
        $e = Establishment::factory()->create(['currency' => 'CDF']);

        $this->postJson('/api/v1/payments', [
            'establishment_id' => $e->id, 'student_name' => 'X', 'student_matricule' => 'M-1',
            'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => 100,
        ])->assertCreated();

        $this->assertDatabaseHas('transactions', ['establishment_id' => $e->id, 'currency' => 'CDF']);
    }

    public function test_admin_modifie_son_profil(): void
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);
        $headers = ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];

        $this->patchJson('/api/v1/admin/me', ['name' => 'Nouveau Nom', 'email' => 'nouvel@abcpay.cd'], $headers)
            ->assertOk()->assertJsonPath('data.name', 'Nouveau Nom')->assertJsonPath('data.email', 'nouvel@abcpay.cd');

        // Le nouveau mot de passe fonctionne à la connexion.
        $this->patchJson('/api/v1/admin/me', ['password' => 'nouveau-pass-1'], $headers)->assertOk();
        $this->postJson('/api/v1/auth/admin/login', ['email' => 'nouvel@abcpay.cd', 'password' => 'nouveau-pass-1'])->assertOk();
    }

    public function test_devise_invalide_refusee(): void
    {
        $this->patchJson('/api/v1/admin/settings', ['currency' => 'EUR'], $this->adminHeaders())->assertStatus(422);
    }
}
