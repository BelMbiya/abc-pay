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

    public function test_l_invitation_de_membre_a_ete_retiree(): void
    {
        $mine = Establishment::factory()->create();

        // La route POST n'existe plus (fonctionnalité retirée) → méthode non autorisée.
        $this->postJson('/api/v1/staff/members', [
            'name' => 'Comptable ISC', 'email' => 'compta@isc.cd', 'role' => 'comptable', 'password' => 'motdepasse',
        ], $this->staffHeaders($mine, 'direction'))
            ->assertStatus(405);

        $this->assertDatabaseMissing('users', ['email' => 'compta@isc.cd']);
    }
}
