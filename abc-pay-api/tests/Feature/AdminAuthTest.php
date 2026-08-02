<?php

namespace Tests\Feature;

use App\Models\Admin;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class AdminAuthTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function admin(): Admin
    {
        return Admin::create([
            'name' => 'HQ', 'email' => 'admin@abcpay.cd', 'password' => 'secret123', 'role' => 'super_admin',
        ]);
    }

    public function test_connexion_admin_reussie(): void
    {
        $this->admin();

        $this->postJson('/api/v1/auth/admin/login', ['email' => 'admin@abcpay.cd', 'password' => 'secret123'])
            ->assertOk()
            ->assertJsonStructure(['data' => ['access_token', 'token_type', 'admin' => ['id', 'email', 'role']]]);
    }

    public function test_mauvais_mot_de_passe_renvoie_422(): void
    {
        $this->admin();

        $this->postJson('/api/v1/auth/admin/login', ['email' => 'admin@abcpay.cd', 'password' => 'wrong'])
            ->assertStatus(422);
    }

    public function test_compte_desactive_refuse(): void
    {
        $admin = $this->admin();
        $admin->update(['is_active' => false]);

        $this->postJson('/api/v1/auth/admin/login', ['email' => 'admin@abcpay.cd', 'password' => 'secret123'])
            ->assertStatus(422);
    }

    public function test_endpoint_admin_exige_un_jeton_admin(): void
    {
        // Sans jeton → 401.
        $this->getJson('/api/v1/admin/establishments')->assertStatus(401);
    }
}
