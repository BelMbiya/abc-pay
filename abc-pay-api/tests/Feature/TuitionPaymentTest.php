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

    public function test_devis_frais_a_charge_du_payeur(): void
    {
        $e = Establishment::factory()->create(['commission_rate' => 0.02]);

        $this->postJson('/api/v1/payments/quote', ['establishment_id' => $e->id, 'amount' => 250])
            ->assertOk()
            ->assertJsonPath('data.service_fee', 5)   // frais À LA CHARGE DU PAYEUR (250 * 2 %)
            ->assertJsonPath('data.total', 255)       // total payeur = montant + frais
            ->assertJsonPath('data.commission', 5)    // revenu abc pay (= frais payeur)
            ->assertJsonPath('data.net_establishment', 250); // l'établissement reçoit le montant PLEIN
    }

    public function test_annuaire_expose_le_badge_verified(): void
    {
        Establishment::factory()->create(['name' => 'ZZ Ecole Vérifiée']);

        $row = collect($this->getJson('/api/v1/establishments')->assertOk()->json('data'))
            ->firstWhere('name', 'ZZ Ecole Vérifiée');

        $this->assertNotNull($row);
        $this->assertTrue($row['verified']); // établissement vetté → badge « Verified »
    }

    public function test_paiement_cree_transaction_et_recu(): void
    {
        $e = Establishment::factory()->create();

        $res = $this->postJson('/api/v1/payments', $this->payload($e))
            ->assertCreated()
            ->assertJsonPath('data.transaction.total', '255.00')       // le payeur paie montant + frais (250 + 5)
            ->assertJsonPath('data.transaction.service_fee', '5.00');  // frais à la charge du payeur

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

    public function test_montant_superieur_au_frais_selectionne_est_refuse(): void
    {
        // Barème apparié : Minerval=250, Frais académiques=350.
        $e = Establishment::factory()->create();

        // 300 ≤ frais le plus élevé (350) MAIS > Minerval (250) → refusé (cap PAR frais).
        $this->postJson('/api/v1/payments', $this->payload($e, ['fee_type' => 'Minerval', 'amount' => 300]))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');
        $this->assertDatabaseCount('transactions', 0);

        // Le même montant 300 est accepté pour « Frais académiques » (cap 350).
        $this->postJson('/api/v1/payments', $this->payload($e, ['fee_type' => 'Frais académiques', 'amount' => 300]))
            ->assertCreated();
    }

    public function test_etablissement_sans_bareme_ne_peut_pas_encaisser_ni_apparaitre(): void
    {
        // Aucun barème (colonnes vides, aucun fee_schedule).
        $e = Establishment::factory()->create(['name' => 'Institut Sans Bareme', 'fees' => [], 'presets' => []]);

        // Pas de barème → paiement refusé (règle métier).
        $this->postJson('/api/v1/payments', $this->payload($e, ['amount' => 100]))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');
        $this->assertDatabaseCount('transactions', 0);

        // …et il n'apparaît pas dans la liste des écoles (non encaissable).
        $this->getJson('/api/v1/establishments?query=Sans%20Bareme')
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_le_bareme_relationnel_pilote_le_paiement_et_la_liste(): void
    {
        // Colonnes legacy vides : le barème vient des fee_schedules édités par l'établissement.
        $e = Establishment::factory()->create(['name' => 'Institut Bareme Reel', 'fees' => [], 'presets' => []]);
        $type = FeeType::create([
            'establishment_id' => $e->id, 'name' => 'Frais de laboratoire', 'frequency' => 'annuel', 'is_optional' => false,
        ]);
        \App\Models\FeeSchedule::create([
            'establishment_id' => $e->id, 'fee_type_id' => $type->id,
            'academic_group' => null, 'amount' => 400, 'currency' => 'USD',
        ]);

        // La ligne de barème personnalisée apparaît bien à la liste (donc au paiement) — #8.
        $this->getJson('/api/v1/establishments?query=Bareme%20Reel')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.fees.0', 'Frais de laboratoire');

        // Plafond = barème : 400 accepté, 401 refusé.
        $this->postJson('/api/v1/payments', $this->payload($e, ['fee_type' => 'Frais de laboratoire', 'amount' => 400]))
            ->assertCreated();
        $this->postJson('/api/v1/payments', $this->payload($e, ['fee_type' => 'Frais de laboratoire', 'amount' => 401]))
            ->assertStatus(422);
    }

    public function test_etablissement_en_verification_est_masque_et_ne_recoit_pas(): void
    {
        // Établissement avec barème, MAIS direction en cours de vérification KYC.
        $e = Establishment::factory()->create(['name' => 'Institut En Verif', 'fees' => ['Minerval'], 'presets' => [250]]);
        $dir = \App\Models\User::factory()->create();
        $dir->forceFill(['kyc_status' => 'pending'])->save();
        \App\Models\EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $dir->id, 'role' => 'direction', 'kyc_required' => true]);

        // N'apparaît pas dans la liste des écoles…
        $this->getJson('/api/v1/establishments?query=En%20Verif')->assertOk()->assertJsonCount(0, 'data');
        // …et ne peut pas recevoir de paiement.
        $this->postJson('/api/v1/payments', $this->payload($e))->assertStatus(422);
        $this->assertDatabaseCount('transactions', 0);

        // Une fois PLEINEMENT vérifié (identité direction + KYB complet) : réapparaît et encaisse.
        $dir->forceFill(['kyc_status' => 'approved'])->save();
        foreach (\App\Services\Tenancy\EstablishmentDocuments::requiredKeys($e->fresh()) as $type) {
            \App\Models\EstablishmentDocument::create(['establishment_id' => $e->id, 'type' => $type, 'status' => 'approved']);
        }
        $this->getJson('/api/v1/establishments?query=En%20Verif')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/payments', $this->payload($e))->assertCreated();
    }

    public function test_etablissement_suspendu_ne_peut_ni_recevoir_ni_etre_devise(): void
    {
        // Suspendu (is_active=false) mais avec barème : ne doit RIEN encaisser, même en appel direct.
        $e = Establishment::factory()->create(['is_active' => false, 'fees' => ['Minerval'], 'presets' => [250]]);

        $this->postJson('/api/v1/payments', $this->payload($e))->assertStatus(422);
        $this->assertDatabaseCount('transactions', 0);

        // Le devis aussi est refusé (ne fuite pas le taux de commission d'un suspendu).
        $this->postJson('/api/v1/payments/quote', ['establishment_id' => $e->id, 'amount' => 250])->assertStatus(422);
    }

    public function test_type_de_frais_hors_bareme_est_refuse(): void
    {
        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [250]]);

        // Un libellé inconnu ne doit pas se replier sur le plafond le plus élevé : refus net.
        $this->postJson('/api/v1/payments', $this->payload($e, ['fee_type' => 'Frais fantôme', 'amount' => 250]))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_kyb_incomplet_bloque_l_encaissement(): void
    {
        // Établissement soumis au KYB (direction kyc_required), identité approuvée, MAIS docs incomplets.
        $e = Establishment::factory()->create(['name' => 'Institut KYB', 'fees' => ['Minerval'], 'presets' => [250]]);
        $dir = \App\Models\User::factory()->create();
        $dir->forceFill(['kyc_status' => 'approved'])->save();
        \App\Models\EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $dir->id, 'role' => 'direction', 'kyc_required' => true]);

        // KYB incomplet → masqué de la liste + encaissement refusé.
        $this->getJson('/api/v1/establishments?query=Institut%20KYB')->assertOk()->assertJsonCount(0, 'data');
        $this->postJson('/api/v1/payments', $this->payload($e))->assertStatus(422);

        // Tous les documents obligatoires approuvés → devient encaissable.
        foreach (\App\Services\Tenancy\EstablishmentDocuments::requiredKeys($e->fresh()) as $type) {
            \App\Models\EstablishmentDocument::create(['establishment_id' => $e->id, 'type' => $type, 'status' => 'approved']);
        }
        $this->getJson('/api/v1/establishments?query=Institut%20KYB')->assertOk()->assertJsonCount(1, 'data');
        $this->postJson('/api/v1/payments', $this->payload($e))->assertCreated();
    }

    public function test_canal_invalide_renvoie_422(): void
    {
        $e = Establishment::factory()->create();

        $this->postJson('/api/v1/payments', $this->payload($e, ['channel' => 'paypal']))
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');

        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_rejeu_idempotence_anonyme_masque_le_qr_token(): void
    {
        $e = Establishment::factory()->create();
        $headers = ['Idempotency-Key' => 'anon-key-xyz'];

        // Création : le qr_token (secret du reçu) est livré.
        $first = $this->postJson('/api/v1/payments', $this->payload($e), $headers)->assertCreated();
        $this->assertNotNull($first->json('data.receipt.qr_token'));

        // Rejeu anonyme (clé devinée/observée) : même reçu, mais le SECRET n'est pas re-livré.
        $second = $this->postJson('/api/v1/payments', $this->payload($e), $headers)->assertCreated();
        $this->assertSame($first->json('data.receipt.number'), $second->json('data.receipt.number'));
        $this->assertNull($second->json('data.receipt.qr_token'));
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
