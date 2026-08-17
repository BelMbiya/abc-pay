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

    /** Charge d'inscription : jeton + intention signup + identité (nom obligatoire). */
    private function signup(string $phone, array $profile = []): array
    {
        return [
            'firebase_id_token' => "fake:{$phone}",
            'intent' => 'signup',
            'profile' => array_merge(['name' => 'Grace Mbuyi'], $profile),
        ];
    }

    public function test_inscription_firebase_cree_user_avec_identite_et_renvoie_jwt(): void
    {
        $this->postJson('/api/v1/auth/firebase', $this->signup('+243811112222'))
            ->assertOk()
            ->assertJsonPath('data.user.phone', '+243811112222')
            ->assertJsonPath('data.user.name', 'Grace Mbuyi')
            ->assertJsonStructure(['data' => ['access_token', 'refresh_token', 'token_type', 'expires_in']]);

        $this->assertDatabaseHas('users', ['phone' => '+243811112222', 'name' => 'Grace Mbuyi']);
    }

    public function test_inscription_sans_nom_est_refusee(): void
    {
        // Garde-fou anti-compte-fantôme : un signup SANS identité ne crée rien.
        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243811119999', 'intent' => 'signup'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');

        $this->assertDatabaseCount('users', 0);
    }

    public function test_connexion_numero_inconnu_est_refusee(): void
    {
        // Se connecter (intent login par défaut) avec un numéro SANS compte → refus.
        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243888000111'])
            ->assertStatus(404)
            ->assertJsonPath('error.code', 'account_not_found');

        $this->assertDatabaseCount('users', 0); // aucune création à la connexion
    }

    public function test_connexion_numero_existant_reussit(): void
    {
        // Le compte est d'abord créé (inscription), puis la connexion (login) réussit.
        $this->postJson('/api/v1/auth/firebase', $this->signup('+243888000222'))->assertOk();
        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243888000222', 'intent' => 'login'])
            ->assertOk()
            ->assertJsonPath('data.user.phone', '+243888000222');
    }

    public function test_compte_bloque_ne_peut_pas_se_connecter(): void
    {
        $u = \App\Models\User::create(['phone' => '+243888000333', 'name' => 'Bloqué']);
        \App\Models\User::where('id', $u->id)->update(['is_blocked' => true]); // champ gardé → query builder

        $this->postJson('/api/v1/auth/firebase', ['firebase_id_token' => 'fake:+243888000333', 'intent' => 'login'])
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'account_blocked');
    }

    public function test_signup_sur_numero_existant_connecte_sans_ecraser_identite(): void
    {
        $this->postJson('/api/v1/auth/firebase', $this->signup('+243888000444', ['name' => 'Nom Officiel']))->assertOk();

        // Un second signup (même numéro) avec un AUTRE nom ne doit PAS remplacer l'identité.
        $this->postJson('/api/v1/auth/firebase', $this->signup('+243888000444', ['name' => 'Usurpateur']))
            ->assertOk()
            ->assertJsonPath('data.user.name', 'Nom Officiel');

        $this->assertDatabaseCount('users', 1);
        $this->assertDatabaseHas('users', ['phone' => '+243888000444', 'name' => 'Nom Officiel']);
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
        $token = $this->postJson('/api/v1/auth/firebase', $this->signup('+243999888777'))
            ->json('data.access_token');

        $this->getJson('/api/v1/me', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('data.phone', '+243999888777');
    }

    public function test_deux_inscriptions_meme_numero_ne_duplique_pas(): void
    {
        $this->postJson('/api/v1/auth/firebase', $this->signup('+243700000000'));
        $this->postJson('/api/v1/auth/firebase', $this->signup('+243700000000'));

        $this->assertDatabaseCount('users', 1);
    }

    /** Test d'attaque : un jeton altéré ne doit jamais authentifier. */
    public function test_jeton_altere_rejete_sur_me(): void
    {
        $token = $this->postJson('/api/v1/auth/firebase', $this->signup('+243700000001'))
            ->json('data.access_token');

        $this->getJson('/api/v1/me', ['Authorization' => "Bearer {$token}TAMPER"])
            ->assertStatus(401);
    }
}
