<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class StaffAuthTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function staffUser(): array
    {
        $establishment = Establishment::factory()->create();
        $user = User::factory()->create(['email' => 'direction@isc.cd', 'password' => Hash::make('password')]);
        EstablishmentStaff::create(['establishment_id' => $establishment->id, 'user_id' => $user->id, 'role' => 'direction']);

        return [$establishment, $user];
    }

    public function test_connexion_staff_renvoie_un_jwt(): void
    {
        [$establishment] = $this->staffUser();

        $this->postJson('/api/v1/auth/staff/login', ['email' => 'direction@isc.cd', 'password' => 'password'])
            ->assertOk()
            ->assertJsonPath('data.user.role', 'direction')
            ->assertJsonPath('data.user.establishment_id', $establishment->id)
            ->assertJsonStructure(['data' => ['access_token', 'token_type', 'expires_in']]);
    }

    public function test_mauvais_mot_de_passe_renvoie_422(): void
    {
        $this->staffUser();

        $this->postJson('/api/v1/auth/staff/login', ['email' => 'direction@isc.cd', 'password' => 'mauvais'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'invalid_credentials');
    }

    public function test_compte_sans_acces_etablissement_renvoie_422(): void
    {
        User::factory()->create(['email' => 'inconnu@x.cd', 'password' => Hash::make('password')]);

        $this->postJson('/api/v1/auth/staff/login', ['email' => 'inconnu@x.cd', 'password' => 'password'])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'invalid_credentials');
    }
}
