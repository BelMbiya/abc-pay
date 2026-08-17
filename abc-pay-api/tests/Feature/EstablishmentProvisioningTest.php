<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class EstablishmentProvisioningTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function adminHeaders(): array
    {
        $admin = Admin::firstOrCreate(
            ['email' => 'hq@abcpay.cd'],
            ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin'],
        );

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
    }

    public function test_admin_cree_un_etablissement_avec_son_compte_de_connexion(): void
    {
        $res = $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Collège Excellence',
            'type' => 'École secondaire',
            'city' => 'Kinshasa',
            'login_email' => 'direction@excellence.cd',
            'login_password' => 'password',
        ], $this->adminHeaders())->assertCreated();

        $this->assertDatabaseHas('establishments', ['name' => 'Collège Excellence', 'level' => 'secondaire']);
        $this->assertDatabaseHas('users', ['email' => 'direction@excellence.cd']);
        $res->assertJsonPath('data.login_email', 'direction@excellence.cd');

        // Le compte provisionné peut se connecter au back-office établissement.
        $this->postJson('/api/v1/auth/staff/login', ['email' => 'direction@excellence.cd', 'password' => 'password'])
            ->assertOk();
    }

    public function test_email_de_connexion_doit_etre_unique(): void
    {
        $payload = [
            'name' => 'Ets A', 'type' => 'Université',
            'login_email' => 'dup@x.cd', 'login_password' => 'password',
        ];
        $this->postJson('/api/v1/admin/establishments', $payload, $this->adminHeaders())->assertCreated();
        $this->postJson('/api/v1/admin/establishments', array_merge($payload, ['name' => 'Ets B']), $this->adminHeaders())
            ->assertStatus(422);
    }

    public function test_admin_modifie_le_compte_de_connexion(): void
    {
        $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Ets Modif', 'type' => 'Université',
            'login_email' => 'ancien@x.cd', 'login_password' => 'password',
        ], $this->adminHeaders())->assertCreated();

        $est = Establishment::first();

        $this->patchJson("/api/v1/admin/establishments/{$est->id}/login", [
            'login_email' => 'nouveau@x.cd', 'login_password' => 'newpass12',
        ], $this->adminHeaders())->assertOk()->assertJsonPath('data.login_email', 'nouveau@x.cd');

        // Le nouveau compte fonctionne, l'ancien non.
        $this->postJson('/api/v1/auth/staff/login', ['email' => 'nouveau@x.cd', 'password' => 'newpass12'])->assertOk();
        $this->postJson('/api/v1/auth/staff/login', ['email' => 'ancien@x.cd', 'password' => 'password'])->assertStatus(422);
    }

    public function test_admin_modifie_les_infos_et_le_statut(): void
    {
        $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Ets Info', 'type' => 'École primaire',
            'login_email' => 'info@x.cd', 'login_password' => 'password',
        ], $this->adminHeaders())->assertCreated();
        $est = Establishment::first();

        $this->patchJson("/api/v1/admin/establishments/{$est->id}", [
            'name' => 'Ets Info Renommé', 'type' => 'Université', 'commission_rate' => 3, 'is_active' => false,
        ], $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.name', 'Ets Info Renommé')
            ->assertJsonPath('data.level', 'superieur')   // dérivé du type
            ->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('establishments', ['id' => $est->id, 'name' => 'Ets Info Renommé', 'commission_rate' => 0.03, 'is_active' => false]);
    }

    public function test_admin_supprime_un_etablissement_sans_transactions(): void
    {
        $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Ets Supprimable', 'type' => 'Université',
            'login_email' => 'suppr@x.cd', 'login_password' => 'password',
        ], $this->adminHeaders())->assertCreated();
        $est = Establishment::first();

        $this->deleteJson("/api/v1/admin/establishments/{$est->id}", [], $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.deleted', true);

        $this->assertDatabaseMissing('establishments', ['id' => $est->id]);
        $this->assertDatabaseMissing('users', ['email' => 'suppr@x.cd']); // compte de connexion supprimé
        $this->assertDatabaseMissing('establishment_staff', ['establishment_id' => $est->id]);
    }

    public function test_suppression_refusee_si_historique_de_transactions(): void
    {
        $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Ets Actif', 'type' => 'Université',
            'login_email' => 'actif@x.cd', 'login_password' => 'password',
        ], $this->adminHeaders())->assertCreated();
        $est = Establishment::first();

        \App\Models\Transaction::create([
            'type' => 'tuition', 'establishment_id' => $est->id, 'student_name' => 'Élève X',
            'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => 250, 'total' => 250,
            'currency' => 'USD', 'status' => 'confirmee',
        ]);

        $this->deleteJson("/api/v1/admin/establishments/{$est->id}", [], $this->adminHeaders())
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'cannot_delete');

        $this->assertDatabaseHas('establishments', ['id' => $est->id]); // toujours là
    }

    public function test_suppression_exige_une_auth_admin(): void
    {
        $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Ets Protégé', 'type' => 'Université',
            'login_email' => 'prot@x.cd', 'login_password' => 'password',
        ], $this->adminHeaders())->assertCreated();
        $est = Establishment::first();

        $this->deleteJson("/api/v1/admin/establishments/{$est->id}")->assertStatus(401);
        $this->assertDatabaseHas('establishments', ['id' => $est->id]);
    }

    public function test_liste_expose_email_de_connexion(): void
    {
        $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Ets Liste', 'type' => 'École primaire',
            'login_email' => 'liste@x.cd', 'login_password' => 'password',
        ], $this->adminHeaders())->assertCreated();

        $this->getJson('/api/v1/admin/establishments', $this->adminHeaders())
            ->assertOk()
            ->assertJsonPath('data.0.login_email', 'liste@x.cd')
            ->assertJsonPath('data.0.name', 'Ets Liste');
    }
}
