<?php

namespace Tests\Feature;

use App\Models\Establishment;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Statistiques publiques agrégées affichées sur la landing.
 */
class PublicStatsTest extends TestCase
{
    use RefreshDatabase;

    public function test_expose_des_agregats_sans_donnee_nominative(): void
    {
        $e = Establishment::factory()->create();
        Establishment::factory()->create(['is_active' => false]); // exclu du décompte

        $this->postJson('/api/v1/payments', [
            'establishment_id' => $e->id,
            'student_name' => 'Ilunga Mbuyi Grace',
            'student_matricule' => 'ISC-2026-0001',
            'payer_relation' => 'Parent',
            'fee_type' => 'Minerval',
            'channel' => 'mpesa',
            'amount' => 250,
        ])->assertCreated();

        $res = $this->getJson('/api/v1/stats/public')->assertOk();

        $res->assertJsonPath('data.establishments', 1)   // seul l'établissement actif
            ->assertJsonPath('data.payments', 1)
            ->assertJsonPath('data.operators', 4);
        $this->assertGreaterThanOrEqual(250, $res->json('data.volume'));

        // Aucune donnée nominative dans la réponse publique.
        $this->assertStringNotContainsString('Ilunga', json_encode($res->json()));
    }
}
