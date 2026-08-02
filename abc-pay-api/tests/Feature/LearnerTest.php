<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\Learner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\ActsAsStaff;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class LearnerTest extends TestCase
{
    use ActsAsStaff, RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    public function test_sans_token_staff_renvoie_401(): void
    {
        $this->getJson('/api/v1/staff/learners')->assertStatus(401);
    }

    public function test_liste_les_apprenants_du_seul_etablissement_du_staff(): void
    {
        $mine = Establishment::factory()->create();
        Learner::factory()->count(2)->create(['establishment_id' => $mine->id]);
        Learner::factory()->count(4)->create(); // autre établissement

        $this->getJson('/api/v1/staff/learners', $this->staffHeaders($mine))
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_cree_un_apprenant(): void
    {
        $mine = Establishment::factory()->create();

        $this->postJson('/api/v1/staff/learners', [
            'last_name' => 'Ilunga',
            'middle_name' => 'Mbuyi',
            'first_name' => 'Grace',
            'academic_group' => 'Bac 2 · Informatique de Gestion',
            'matricule' => 'ISC-2026-0500',
            'parent_name' => 'Mbuyi Kalonji',
            'parent_phone' => '+243811112222',
            'parent_relation' => 'parent',
        ], $this->staffHeaders($mine))
            ->assertCreated()
            ->assertJsonPath('data.name', 'Ilunga Mbuyi Grace')
            ->assertJsonPath('data.status', 'actif');

        $this->assertDatabaseHas('learners', ['establishment_id' => $mine->id, 'first_name' => 'Grace', 'last_name' => 'Ilunga']);
    }

    public function test_nom_et_prenom_obligatoires(): void
    {
        $mine = Establishment::factory()->create();

        $this->postJson('/api/v1/staff/learners', ['middle_name' => 'Mbuyi'], $this->staffHeaders($mine))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');
    }

    public function test_relance_un_apprenant_est_enregistree(): void
    {
        $mine = Establishment::factory()->create();
        $learner = Learner::factory()->create(['establishment_id' => $mine->id]);

        $this->postJson("/api/v1/staff/learners/{$learner->id}/remind", [], $this->staffHeaders($mine))
            ->assertOk()
            ->assertJsonPath('data.status', 'sent');

        $this->assertDatabaseHas('reminders', ['learner_id' => $learner->id, 'establishment_id' => $mine->id]);
    }

    public function test_relance_apprenant_autre_etablissement_interdite(): void
    {
        $mine = Establishment::factory()->create();
        $other = Learner::factory()->create(); // autre établissement

        $this->postJson("/api/v1/staff/learners/{$other->id}/remind", [], $this->staffHeaders($mine))
            ->assertStatus(403);

        $this->assertDatabaseCount('reminders', 0);
    }
}
