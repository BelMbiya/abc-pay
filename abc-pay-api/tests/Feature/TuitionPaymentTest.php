<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\FeeItem;
use App\Models\FeeType;
use App\Models\Learner;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TuitionPaymentTest extends TestCase
{
    use RefreshDatabase;

    private function payload(Establishment $e, array $overrides = []): array
    {
        return array_merge([
            'establishment_id' => $e->id,
            'student_name' => 'Ilunga Mbuyi Grace',
            'student_matricule' => 'ISC-2026-0001',
            'student_info' => 'Bac 2 : Informatique',
            'payer_relation' => 'Parent',
            'fee_type' => 'Minerval',
            'channel' => 'mpesa',
            'amount' => 250,
        ], $overrides);
    }

    public function test_recherche_etablissements(): void
    {
        Establishment::factory()->create(['name' => 'Institut Supérieur de Commerce']);
        Establishment::factory()->create(['name' => 'Université de Kinshasa']);

        $this->getJson('/api/v1/establishments?query=commerce')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Institut Supérieur de Commerce');
    }

    public function test_devis_aucun_frais_payeur_commission_etablissement(): void
    {
        $e = Establishment::factory()->create(['commission_rate' => 0.02]);

        $this->postJson('/api/v1/payments/quote', ['establishment_id' => $e->id, 'amount' => 250])
            ->assertOk()
            ->assertJsonPath('data.service_fee', 0)   // rien à charge du payeur
            ->assertJsonPath('data.total', 250)       // total = montant exact
            ->assertJsonPath('data.commission', 5)    // 250 * 2 % côté établissement
            ->assertJsonPath('data.net_establishment', 245);
    }

    public function test_paiement_cree_transaction_et_recu(): void
    {
        $e = Establishment::factory()->create();

        $res = $this->postJson('/api/v1/payments', $this->payload($e))
            ->assertCreated()
            ->assertJsonPath('data.transaction.total', '250.00')       // le payeur paie le montant exact
            ->assertJsonPath('data.transaction.service_fee', '0.00');  // aucun frais payeur

        $this->assertDatabaseCount('transactions', 1);
        $this->assertDatabaseCount('receipts', 1);
        $this->assertStringStartsWith('RC-', $res->json('data.receipt.number'));
    }

    public function test_paiement_trace_l_apprenant_et_le_lie(): void
    {
        $e = Establishment::factory()->create();

        $this->postJson('/api/v1/payments', $this->payload($e, ['student_name' => 'Ilunga Mbuyi Grace']))->assertCreated();

        // Un apprenant tracé (source paiement) est créé et lié à la transaction.
        $this->assertDatabaseHas('learners', ['establishment_id' => $e->id, 'last_name' => 'Ilunga Mbuyi Grace', 'source' => 'paiement']);
        $this->assertSame(1, \App\Models\Transaction::whereNotNull('learner_id')->count());

        // Un 2e paiement pour le même apprenant ne le duplique pas.
        $this->postJson('/api/v1/payments', $this->payload($e, ['student_name' => 'Ilunga Mbuyi Grace']))->assertCreated();
        $this->assertSame(1, \App\Models\Learner::where('source', 'paiement')->count());
    }

    public function test_matricule_obligatoire_pour_payer(): void
    {
        $e = Establishment::factory()->create();
        $p = $this->payload($e);
        unset($p['student_matricule']);

        $this->postJson('/api/v1/payments', $p)->assertStatus(422);
    }

    public function test_paiement_impute_sur_l_apprenant_inscrit_et_ne_le_duplique_pas(): void
    {
        $e = Establishment::factory()->create(['billing_mode' => 'fee_management']);
        $type = FeeType::factory()->create(['establishment_id' => $e->id]);
        $learner = Learner::factory()->create(['establishment_id' => $e->id, 'source' => 'registre', 'matricule' => 'M-100']);
        FeeItem::create(['establishment_id' => $e->id, 'learner_id' => $learner->id, 'fee_type_id' => $type->id, 'label' => 'Minerval', 'amount_due' => 500, 'amount_paid' => 0]);

        $this->postJson('/api/v1/payments', $this->payload($e, ['student_matricule' => 'M-100', 'amount' => 200]))->assertCreated();

        // Le poste est réduit de 200 (solde 500 → 300).
        $this->assertSame(200.0, (float) $learner->feeItems()->first()->amount_paid);
        // Aucun apprenant « tracé » créé : le paiement est allé sur l'inscrit.
        $this->assertSame(0, Learner::where('source', 'paiement')->count());
        $this->assertSame($learner->id, Transaction::first()->learner_id);
    }

    public function test_canal_invalide_renvoie_422(): void
    {
        $e = Establishment::factory()->create();

        $this->postJson('/api/v1/payments', $this->payload($e, ['channel' => 'paypal']))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_idempotence_ne_cree_quune_transaction(): void
    {
        $e = Establishment::factory()->create();
        $headers = ['Idempotency-Key' => 'test-key-123'];

        $first = $this->postJson('/api/v1/payments', $this->payload($e), $headers)->assertCreated();
        $second = $this->postJson('/api/v1/payments', $this->payload($e), $headers)->assertCreated();

        // Même clé → une seule transaction, même reçu renvoyé.
        $this->assertDatabaseCount('transactions', 1);
        $this->assertSame($first->json('data.receipt.number'), $second->json('data.receipt.number'));
        $this->assertSame('test-key-123', Transaction::first()->idempotency_key);
    }
}
