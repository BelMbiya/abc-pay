<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\FeeType;
use App\Models\Learner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\ActsAsStaff;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class FeeScheduleTest extends TestCase
{
    use ActsAsStaff, RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    public function test_sans_token_staff_renvoie_401(): void
    {
        $this->getJson('/api/v1/staff/fee-schedules')->assertStatus(401);
    }

    public function test_creer_un_bareme_genere_les_postes_et_le_solde(): void
    {
        $mine = Establishment::factory()->create();
        $type = FeeType::factory()->create(['establishment_id' => $mine->id, 'name' => 'Minerval']);
        $learner = Learner::factory()->create(['establishment_id' => $mine->id, 'academic_group' => 'Bac 2', 'source' => 'registre']);

        $this->postJson('/api/v1/staff/fee-schedules', ['fee_type_id' => $type->id, 'academic_group' => 'Bac 2', 'amount' => 300], $this->staffHeaders($mine))
            ->assertCreated()
            ->assertJsonPath('data.amount', 300);

        // Le poste de frais est créé chez l'apprenant → solde = 300.
        $this->assertDatabaseHas('fee_items', ['learner_id' => $learner->id]);
        $this->getJson('/api/v1/staff/learners', $this->staffHeaders($mine))
            ->assertOk()
            ->assertJsonPath('data.0.balance', 300);
    }

    public function test_modifier_un_bareme_met_a_jour_le_montant_des_postes_non_payes(): void
    {
        $mine = Establishment::factory()->create();
        $type = FeeType::factory()->create(['establishment_id' => $mine->id]);
        $learner = Learner::factory()->create(['establishment_id' => $mine->id, 'source' => 'registre']);

        $id = $this->postJson('/api/v1/staff/fee-schedules', ['fee_type_id' => $type->id, 'amount' => 300], $this->staffHeaders($mine))
            ->assertCreated()->json('data.id');

        $this->patchJson("/api/v1/staff/fee-schedules/{$id}", ['amount' => 250], $this->staffHeaders($mine))
            ->assertOk()->assertJsonPath('data.amount', 250);

        // Le poste NON payé de l'apprenant suit le nouveau montant.
        $this->assertDatabaseHas('fee_items', ['learner_id' => $learner->id, 'amount_due' => 250]);
    }

    public function test_supprimer_un_bareme_retire_les_postes_non_payes_mais_garde_les_payes(): void
    {
        $mine = Establishment::factory()->create();
        $type = FeeType::factory()->create(['establishment_id' => $mine->id]);
        $paye = Learner::factory()->create(['establishment_id' => $mine->id, 'source' => 'registre']);
        $impaye = Learner::factory()->create(['establishment_id' => $mine->id, 'source' => 'registre']);

        $id = $this->postJson('/api/v1/staff/fee-schedules', ['fee_type_id' => $type->id, 'amount' => 200], $this->staffHeaders($mine))
            ->assertCreated()->json('data.id');
        $this->assertDatabaseCount('fee_items', 2);

        // Un apprenant a déjà payé une partie → son poste doit être CONSERVÉ.
        $paye->feeItems()->update(['amount_paid' => 50]);

        $this->deleteJson("/api/v1/staff/fee-schedules/{$id}", [], $this->staffHeaders($mine))->assertOk();

        $this->assertDatabaseMissing('fee_items', ['learner_id' => $impaye->id]); // non payé → retiré
        $this->assertDatabaseHas('fee_items', ['learner_id' => $paye->id]);       // payé → conservé
        $this->assertDatabaseMissing('fee_schedules', ['id' => $id]);
    }

    public function test_supprimer_un_type_utilise_par_le_bareme_est_refuse(): void
    {
        $mine = Establishment::factory()->create();
        $type = FeeType::factory()->create(['establishment_id' => $mine->id]);
        $this->postJson('/api/v1/staff/fee-schedules', ['fee_type_id' => $type->id, 'amount' => 100], $this->staffHeaders($mine))->assertCreated();

        $this->deleteJson("/api/v1/staff/fee-types/{$type->id}", [], $this->staffHeaders($mine))->assertStatus(422);
        $this->assertDatabaseHas('fee_types', ['id' => $type->id]);
    }

    public function test_bareme_toutes_promotions_applique_a_tout_le_monde(): void
    {
        $mine = Establishment::factory()->create();
        $type = FeeType::factory()->create(['establishment_id' => $mine->id]);
        Learner::factory()->count(2)->create(['establishment_id' => $mine->id, 'source' => 'registre']);

        $this->postJson('/api/v1/staff/fee-schedules', ['fee_type_id' => $type->id, 'amount' => 100], $this->staffHeaders($mine))
            ->assertCreated();

        $this->assertDatabaseCount('fee_items', 2);
    }
}
