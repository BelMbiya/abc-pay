<?php

namespace Tests\Feature;

use App\Models\Establishment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\ActsAsStaff;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class StaffMemberTest extends TestCase
{
    use ActsAsStaff, RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    public function test_liste_les_membres_de_l_etablissement(): void
    {
        $mine = Establishment::factory()->create();

        $this->getJson('/api/v1/staff/members', $this->staffHeaders($mine))
            ->assertOk()
            ->assertJsonCount(1, 'data'); // le staff du token
    }

    public function test_la_direction_peut_inviter_un_membre(): void
    {
        $mine = Establishment::factory()->create();

        $this->postJson('/api/v1/staff/members', [
            'name' => 'Comptable ISC', 'email' => 'compta@isc.cd', 'role' => 'comptable', 'password' => 'motdepasse',
        ], $this->staffHeaders($mine, 'direction'))
            ->assertCreated()
            ->assertJsonPath('data.role', 'comptable');

        $this->assertDatabaseHas('users', ['email' => 'compta@isc.cd']);
    }

    public function test_un_role_non_direction_ne_peut_pas_inviter(): void
    {
        $mine = Establishment::factory()->create();

        $this->postJson('/api/v1/staff/members', [
            'name' => 'X', 'email' => 'x@isc.cd', 'role' => 'caissier', 'password' => 'motdepasse',
        ], $this->staffHeaders($mine, 'comptable'))
            ->assertStatus(403);
    }

    public function test_membre_deja_present_renvoie_422(): void
    {
        $mine = Establishment::factory()->create();
        $headers = $this->staffHeaders($mine, 'direction');
        $payload = ['name' => 'Y', 'email' => 'y@isc.cd', 'role' => 'caissier', 'password' => 'motdepasse'];

        $this->postJson('/api/v1/staff/members', $payload, $headers)->assertCreated();
        $this->postJson('/api/v1/staff/members', $payload, $headers)->assertStatus(422);
    }
}
