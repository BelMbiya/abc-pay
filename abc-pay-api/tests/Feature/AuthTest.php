<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    public function test_connexion_firebase_cree_user_et_renvoie_jwt(): void
    {
        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243811112222'])
            ->assertOk()
            ->assertJsonPath('data.user.phone', '+243811112222')
            ->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'token_type', 'expires_in']]);

        $this->assertDatabaseHas('users', ['phone' => '+243811112222']);
    }

    public function test_jeton_invalide_renvoie_422(): void
    {
        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'mauvais-jeton'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'invalid_token');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_me_exige_un_jwt(): void
    {
        $this->getJson('/api/v1/me')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_me_renvoie_le_profil_avec_jwt(): void
    {
        $token = $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243999888777'])
            ->json('data.access_token');

        $this->getJson('/api/v1/me', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('data.phone', '+243999888777');
    }

    public function test_deux_connexions_meme_numero_ne_duplique_pas(): void
    {
        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243700000000']);
        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243700000000']);

        $this->assertDatabaseCount('users', 1);
    }

    /** Test d'attaque : un jeton altéré ne doit jamais authentifier. */
    public function test_jeton_altere_rejete_sur_me(): void
    {
        $token = $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243700000001'])
            ->json('data.access_token');

        $this->getJson('/api/v1/me', ['Authorization' => "Bearer {$token}TAMPER"])
            ->assertStatus(401);
    }
}
