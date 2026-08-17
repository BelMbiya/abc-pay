<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\Receipt;
use App\Services\Document\ReceiptVerificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Vérification d'authenticité d'un reçu (anti-fraude).
 *
 * Politique : le serveur fait foi. Un reçu est authentique s'il porte un
 * `qr_token` connu en base ; le numéro seul (prévisible) n'authentifie jamais.
 * La réponse est minimale et masque les données personnelles.
 */
class ReceiptVerificationTest extends TestCase
{
    use RefreshDatabase;

    private function payFor(Establishment $e, array $overrides = []): array
    {
        $payload = array_merge([
            'establishment_id' => $e->id,
            'student_name' => 'Ilunga Mbuyi Grace',
            'student_matricule' => 'ISC-2026-0001',
            'student_info' => 'Bac 2 : Informatique',
            'payer_name' => 'Kabeya Tshimanga',
            'payer_phone' => '+243810000000',
            'payer_relation' => 'Parent',
            'fee_type' => 'Minerval',
            'channel' => 'mpesa',
            'amount' => 250,
        ], $overrides);

        return $this->postJson('/api/v1/payments', $payload)->assertCreated()->json('data');
    }

    public function test_un_recu_authentique_est_reconnu_par_son_jeton(): void
    {
        $e = Establishment::factory()->create(['name' => 'Institut Supérieur de Commerce']);
        $data = $this->payFor($e);
        $token = $data['receipt']['qr_token'];

        $this->postJson('/api/v1/receipts/verify', ['token' => $token])
            ->assertOk()
            ->assertJsonPath('data.valid', true)
            ->assertJsonPath('data.receipt.number', $data['receipt']['number'])
            ->assertJsonPath('data.receipt.establishment', 'Institut Supérieur de Commerce')
            ->assertJsonPath('data.receipt.amount', 250)
            ->assertJsonPath('data.receipt.currency', 'USD')
            ->assertJsonPath('data.receipt.status', 'confirmee');
    }

    public function test_un_jeton_inconnu_nest_pas_reconnu(): void
    {
        $this->postJson('/api/v1/receipts/verify', ['token' => str_repeat('x', 48)])
            ->assertOk()
            ->assertJsonPath('data.valid', false)
            ->assertJsonPath('data.receipt', null);
    }

    public function test_le_numero_seul_ne_prouve_rien_mais_numero_plus_code_authentifie(): void
    {
        $e = Establishment::factory()->create();
        $data = $this->payFor($e);
        $number = $data['receipt']['number'];
        $token = $data['receipt']['qr_token'];
        $code = ReceiptVerificationService::manualCode($token);

        // Numéro seul (sans code) : requête invalide (422) — le numéro n'authentifie pas.
        $this->postJson('/api/v1/receipts/verify', ['number' => $number])->assertStatus(422);

        // Numéro + mauvais code : non reconnu.
        $this->postJson('/api/v1/receipts/verify', ['number' => $number, 'code' => 'BADCODE0'])
            ->assertOk()->assertJsonPath('data.valid', false);

        // Numéro + bon code : authentique.
        $this->postJson('/api/v1/receipts/verify', ['number' => $number, 'code' => $code])
            ->assertOk()->assertJsonPath('data.valid', true)
            ->assertJsonPath('data.receipt.number', $number);
    }

    public function test_la_reponse_masque_les_donnees_personnelles(): void
    {
        $e = Establishment::factory()->create();
        $data = $this->payFor($e);

        $res = $this->postJson('/api/v1/receipts/verify', ['token' => $data['receipt']['qr_token']])
            ->assertOk();

        // Nom masqué (prénom + initiales), matricule partiellement masqué.
        $res->assertJsonPath('data.receipt.student_name', 'Ilunga M. G.');
        $this->assertStringContainsString('•', $res->json('data.receipt.student_matricule'));

        // Aucune donnée sensible ne fuit (téléphone/nom du payeur).
        $body = $res->json();
        $this->assertStringNotContainsString('+243810000000', json_encode($body));
        $this->assertStringNotContainsString('Kabeya', json_encode($body));
    }

    public function test_un_recu_annule_reste_reconnu_mais_signale_son_statut(): void
    {
        $e = Establishment::factory()->create();
        $data = $this->payFor($e);
        $receipt = Receipt::where('number', $data['receipt']['number'])->firstOrFail();
        $receipt->transaction->update(['status' => 'annulee']);

        $this->postJson('/api/v1/receipts/verify', ['token' => $data['receipt']['qr_token']])
            ->assertOk()
            ->assertJsonPath('data.valid', true)
            ->assertJsonPath('data.receipt.status', 'annulee');
    }
}
