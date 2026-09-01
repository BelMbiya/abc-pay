<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Models\Settlement;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * Intégration passerelle Araka (Http::fake), sélectionnée via `payment.default_gateway`.
 * Spécificité : PUSH DIRECT (pas de `payment_url`) → transaction `pending`, puis
 * confirmée par le STATUT « par référence » (APPROVED). Un refus (DECLINED) remonte en 422.
 */
class ArakaIntegrationTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
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

    private function adminAuth(): array
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
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

    public function test_paiement_service_via_araka_utilise_le_numero_payeur(): void
    {
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/transactionstatusbyreference/*' => Http::response([['status' => 'APPROVED', 'statusCode' => '200', 'transactionId' => 'ARK-9']]),
            '*/paymentrequest' => Http::response(['transactionId' => 'ARK-9', 'originatingTransactionId' => 'REF', 'statusCode' => '202', 'statusDescription' => 'ACCEPTED']),
        ]);

        $user = User::factory()->create(['name' => 'Jean Kabila', 'phone' => null]); // pas de numéro au profil
        $auth = ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($user)];

        // Le numéro saisi au formulaire (payer_phone) sert de cible du push direct.
        $res = $this->postJson('/api/v1/transactions', [
            'type' => 'service', 'amount' => 12, 'currency' => 'USD', 'channel' => 'mpesa',
            'label' => 'SNEL Électricité', 'reference' => 'CPT-1', 'payer_phone' => '+243810000001',
        ], $auth)->assertCreated();

        $txId = $res->json('data.transaction.id');
        $this->assertSame('pending', $res->json('data.transaction.status'));
        $this->assertNull($res->json('data.payment_url')); // push direct

        // La requête paymentrequest a bien porté le numéro payeur comme walletID.
        Http::assertSent(fn ($request) => str_contains($request->url(), '/paymentrequest')
            && ($request['paymentChannel']['walletID'] ?? null) === '+243810000001');

        $status = $this->getJson("/api/v1/payments/{$txId}/status")->assertOk();
        $this->assertSame('confirmee', $status->json('data.status'));
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

    public function test_reversement_araka_sendmobilemoney_succes_immediat_est_marque_paye(): void
    {
        // Décaissement Araka SYNCHRONE (sendmobilemoney → statusCode 200 SUCCESS) → « payé »
        // immédiatement, sans webhook. Prouve qu'Araka couvre AUSSI le reversement.
        config(['araka.transfer_enabled' => true]);
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/api/pay/sendmobilemoney' => Http::response([
                'transactionId' => 'ARK-PAYOUT-1', 'originatingTransactionId' => 'REF',
                'statusCode' => '200', 'statusDescription' => 'SUCCESS',
            ]),
        ]);

        $e = Establishment::factory()->create([
            'currency' => 'USD', 'payout_phone' => '+243810000700', 'payout_method' => 'mpesa',
        ]);
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'Grace', 'student_matricule' => 'M1', 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => 250, 'service_fee' => 0, 'commission' => 3.75, 'total' => 250,
            'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", ['reference' => 'REV-ARK'], $this->adminAuth())
            ->assertCreated()
            ->assertJsonPath('data.status', 'paid'); // succès immédiat → payé

        $settlement = Settlement::where('establishment_id', $e->id)->firstOrFail();
        $this->assertSame('paid', $settlement->status);
        $this->assertSame('araka', $settlement->gateway);
        $this->assertSame('ARK-PAYOUT-1', $settlement->gateway_transfer_id);
        $this->assertNotNull($settlement->paid_at);

        // La requête sendmobilemoney a bien porté l'opérateur (MPESA) + le numéro bénéficiaire,
        // avec une référence ≤ 20 (contrainte Araka).
        Http::assertSent(function ($request) {
            if (! str_contains($request->url(), '/sendmobilemoney')) {
                return false;
            }

            return ($request['destination']['provider'] ?? null) === 'MPESA'
                && ($request['destination']['walletID'] ?? null) === '+243810000700'
                && strlen((string) ($request['order']['transactionReference'] ?? '')) <= 20;
        });
    }

    public function test_reversement_araka_refus_annule_tout(): void
    {
        // Refus du décaissement (DECLINED) → 422 lisible et AUCUN settlement fantôme (rollback).
        config(['araka.transfer_enabled' => true]);
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/api/pay/sendmobilemoney' => Http::response([
                'transactionId' => 'ARK-PAYOUT-2', 'statusCode' => '400', 'statusDescription' => 'DECLINED / Bad Request',
            ]),
        ]);

        $e = Establishment::factory()->create([
            'currency' => 'USD', 'payout_phone' => '+243810000700', 'payout_method' => 'mpesa',
        ]);
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'X', 'student_matricule' => 'M', 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => 250, 'service_fee' => 0, 'commission' => 3.75, 'total' => 250,
            'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $res = $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", ['reference' => 'REV-KO'], $this->adminAuth())
            ->assertStatus(422);
        $this->assertStringContainsString('Araka', json_encode($res->json(), JSON_UNESCAPED_UNICODE));
        $this->assertDatabaseCount('settlements', 0); // rollback total
    }
}
