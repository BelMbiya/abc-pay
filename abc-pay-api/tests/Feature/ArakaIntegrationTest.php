<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Intégration passerelle Araka (Http::fake), sélectionnée via `payment.default_gateway`.
 * Spécificité : PUSH DIRECT (pas de `payment_url`) → transaction `pending`, puis
 * confirmée par le STATUT « par référence » (APPROVED). Un refus (DECLINED) remonte en 422.
 */
class ArakaIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config([
            'payment.default_gateway' => 'araka',
            'araka.enabled' => true,
            'araka.base_url' => 'https://araka-api-uat.azurewebsites.net',
            'araka.email' => 'merchant@abcpay.cd', 'araka.password' => 'secret',
            'araka.payment_page_id' => 'PP123',
            'araka.hmac_key' => null, // callback non testé ici
        ]);
    }

    private function paymentPayload(Establishment $e): array
    {
        return [
            'establishment_id' => $e->id, 'student_name' => 'Grace', 'student_matricule' => 'M1',
            'payer_name' => 'Jean Kabila', 'payer_phone' => '+243810000700',
            'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => 15,
        ];
    }

    public function test_encaissement_araka_push_direct_pending_puis_confirme_par_statut(): void
    {
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'merchant@abcpay.cd']),
            // L'API renvoie un TABLEAU [ {...} ] (comme l'UAT réel).
            '*/transactionstatusbyreference/*' => Http::response([['status' => 'APPROVED', 'statusCode' => '200', 'transactionId' => 'ARK-1']]),
            '*/paymentrequest' => Http::response(['transactionId' => 'ARK-1', 'originatingTransactionId' => 'REF', 'statusCode' => '202', 'statusDescription' => 'ACCEPTED']),
        ]);

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [15], 'currency' => 'USD']);

        // Init : transaction en attente, SANS URL (push direct sur le téléphone).
        $res = $this->postJson('/api/v1/payments', $this->paymentPayload($e))->assertCreated();
        $txId = $res->json('data.transaction.id');
        $this->assertSame('pending', $res->json('data.transaction.status'));
        $this->assertNull($res->json('data.payment_url')); // pas de page hébergée

        $tx = Transaction::find($txId);
        $this->assertSame('araka', $tx->gateway);
        $this->assertNotNull($tx->gateway_ref);
        $this->assertLessThanOrEqual(20, strlen($tx->gateway_ref)); // contrainte Araka
        $this->assertSame('ARK-1', $tx->payment_token); // id Araka mémorisé (callback)

        // PAGE DE RETOUR (polling) : confirme via le STATUT « par référence » (APPROVED).
        $status = $this->getJson("/api/v1/payments/{$txId}/status")->assertOk();
        $this->assertSame('confirmee', $status->json('data.status'));
        $this->assertDatabaseHas('transactions', ['id' => $txId, 'status' => 'confirmee']);
        $this->assertDatabaseHas('receipts', ['transaction_id' => $txId]);
    }

    public function test_paiement_direct_exige_un_numero(): void
    {
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
        ]);

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [15], 'currency' => 'USD']);
        $payload = $this->paymentPayload($e);
        unset($payload['payer_phone']); // push direct sans numéro → refusé avant Araka

        $res = $this->postJson('/api/v1/payments', $payload)->assertStatus(422);
        $this->assertStringContainsString('numéro', json_encode($res->json(), JSON_UNESCAPED_UNICODE));
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_refus_araka_est_remonte_lisiblement(): void
    {
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/paymentrequest' => Http::response(['transactionId' => 'ARK-2', 'statusCode' => '400', 'statusDescription' => 'DECLINED / Bad Request']),
        ]);

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [15], 'currency' => 'USD']);

        $res = $this->postJson('/api/v1/payments', $this->paymentPayload($e))->assertStatus(422);
        $this->assertStringContainsString('Araka', json_encode($res->json()));
        $this->assertDatabaseCount('transactions', 0); // rollback : pas de transaction fantôme
    }
}
