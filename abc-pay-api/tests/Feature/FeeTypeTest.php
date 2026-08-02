<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\FeeType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\ActsAsStaff;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class FeeTypeTest extends TestCase
{
    use ActsAsStaff, RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    public function test_sans_token_staff_renvoie_401(): void
    {
        $this->getJson('/api/v1/staff/fee-types')
            ->assertStatus(401)
            ->assertJsonPath('error.code', 'unauthenticated');
    }

    public function test_liste_les_frais_du_seul_etablissement_du_staff(): void
    {
        $mine = Establishment::factory()->create();
        FeeType::factory()->count(2)->create(['establishment_id' => $mine->id]);
        // Bruit : un autre établissement (ne doit pas fuiter).
        FeeType::factory()->count(3)->create();

        $this->getJson('/api/v1/staff/fee-types', $this->staffHeaders($mine))
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_cree_un_type_de_frais_pour_son_etablissement(): void
    {
        $mine = Establishment::factory()->create();

        $this->postJson('/api/v1/staff/fee-types', [
            'name' => 'Frais de bibliothèque',
            'frequency' => 'Semestriel',
            'optional' => true,
        ], $this->staffHeaders($mine))
            ->assertCreated()
            ->assertJsonPath('data.name', 'Frais de bibliothèque');

        $this->assertDatabaseHas('fee_types', [
            'establishment_id' => $mine->id,
            'name' => 'Frais de bibliothèque',
        ]);
    }

    public function test_frequence_invalide_renvoie_422(): void
    {
        $mine = Establishment::factory()->create();

        $this->postJson('/api/v1/staff/fee-types', ['name' => 'X', 'frequency' => 'Annuel'], $this->staffHeaders($mine))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');

        $this->assertDatabaseCount('fee_types', 0);
    }
}
