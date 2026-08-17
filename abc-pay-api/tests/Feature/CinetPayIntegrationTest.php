<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Models\Settlement;
use App\Models\Transaction;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * Intégration passerelle CinetPay « Aurore » (Http::fake) :
 *  - ENCAISSEMENT : /payments → `pending` + payment_url (init /v1/payment), puis webhook
 *    (notify_token) → `confirmee`. Mauvais notify_token → 403.
 *  - REVERSEMENT : acte admin → settlement `pending` + envoi, puis webhook → `paid`.
 */
class CinetPayIntegrationTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
        Cache::flush(); // évite un jeton mis en cache entre tests
        config([
            'cinetpay.enabled' => true,
            'cinetpay.api_key' => 'AK', 'cinetpay.api_password' => 'AP',
            'cinetpay.base_url' => 'https://api.cinetpay.net/v1',
            'cinetpay.default_transfer_method' => 'OM',
            'cinetpay.notify_base' => 'https://abcpay.test', 'cinetpay.front_url' => 'https://app.abcpay.test',
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
            'payer_name' => 'Jean Kabila', 'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => 250,
        ];
    }

    public function test_encaissement_cinetpay_pending_puis_confirme_par_statut(): void
    {
        Http::fake([
            '*/oauth/login' => Http::response(['code' => 200, 'status' => 'OK', 'access_token' => 'TOK', 'token_type' => 'bearer', 'expires_in' => 86400]),
            '*/payment/*' => Http::response(['code' => 100, 'status' => 'SUCCESS', 'merchant_transaction_id' => 'REF', 'transaction_id' => 'CP-1']), // GET statut
            '*/payment' => Http::response(['code' => 200, 'status' => 'OK', 'payment_url' => 'https://secure.cinetpay.net/payment/xyz', 'payment_token' => 'PTOK', 'transaction_id' => 'CP-1', 'notify_token' => 'NT-1', 'merchant_transaction_id' => 'REF']), // POST init
        ]);

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [250], 'currency' => 'CDF']);

        // Init : transaction en attente + URL de paiement.
        $res = $this->postJson('/api/v1/payments', $this->paymentPayload($e))->assertCreated();
        $txId = $res->json('data.transaction.id');
        $this->assertSame('pending', $res->json('data.transaction.status'));
        $this->assertSame('https://secure.cinetpay.net/payment/xyz', $res->json('data.payment_url'));

        $tx = Transaction::find($txId);
        $this->assertNotNull($tx->gateway_ref);
        $this->assertLessThanOrEqual(30, strlen($tx->gateway_ref)); // contrainte CinetPay
        $this->assertSame('PTOK', $tx->payment_token);

        // PAGE DE RETOUR (vérif active) : confirme via le STATUT CinetPay, SANS webhook —
        // c'est ce qui fait marcher le sandbox en local sans tunnel.
        $status = $this->getJson("/api/v1/payments/{$txId}/status")->assertOk();
        $this->assertSame('confirmee', $status->json('data.status'));
        $this->assertNotNull($status->json('data.receipt.number'));
        $this->assertNull($status->json('data.receipt.qr_token')); // secret jamais exposé
        $this->assertDatabaseHas('transactions', ['id' => $txId, 'status' => 'confirmee']);
        $this->assertDatabaseHas('receipts', ['transaction_id' => $txId]);

        // Le webhook (déclencheur → re-vérif autoritaire) reste idempotent.
        $this->postJson('/api/v1/webhooks/cinetpay/payment', ['merchant_transaction_id' => $tx->gateway_ref, 'status' => 'SUCCESS'])
            ->assertOk();
        $this->assertDatabaseHas('transactions', ['id' => $txId, 'status' => 'confirmee']);
    }

    public function test_erreur_cinetpay_est_remontee_lisiblement(): void
    {
        // CinetPay refuse (ex. IP non whitelistée : code 2011 NOT_ALLOWED).
        Http::fake([
            '*/oauth/login' => Http::response(['code' => 200, 'status' => 'OK', 'access_token' => 'TOK', 'expires_in' => 86400]),
            '*/payment' => Http::response(['code' => 2011, 'status' => 'NOT_ALLOWED', 'description' => 'This Ip is not withlisted'], 422),
        ]);

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [250], 'currency' => 'CDF']);

        // Le message CinetPay remonte (422), PAS un 500 opaque, et aucune transaction fantôme.
        $res = $this->postJson('/api/v1/payments', $this->paymentPayload($e))->assertStatus(422);
        $this->assertStringContainsString('CinetPay', json_encode($res->json()));
        $this->assertStringContainsString('withlisted', json_encode($res->json()));
        $this->assertDatabaseCount('transactions', 0);
    }

    public function test_reversement_cinetpay_pending_puis_paid_par_webhook(): void
    {
        Http::fake([
            '*/oauth/login' => Http::response(['code' => 200, 'status' => 'OK', 'access_token' => 'TOK', 'token_type' => 'bearer', 'expires_in' => 86400]),
            '*/transfer' => Http::response(['code' => 2002, 'status' => 'PENDING', 'transaction_id' => 'CPT-1', 'notify_token' => 'NT-1']),
        ]);

        $e = Establishment::factory()->create(['currency' => 'CDF', 'payout_phone' => '+243810000000', 'payout_method' => 'FLOOZ']);
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'Grace', 'student_matricule' => 'M1', 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => 1000, 'service_fee' => 0, 'commission' => 20, 'total' => 1000,
            'currency' => 'CDF', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", ['reference' => 'REV-1'], $this->adminAuth())
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $settlement = Settlement::where('establishment_id', $e->id)->firstOrFail();
        $this->assertSame('CPT-1', $settlement->gateway_transfer_id);
        $this->assertSame('NT-1', $settlement->notify_token);

        $this->postJson('/api/v1/webhooks/cinetpay/transfer', ['merchant_transaction_id' => $settlement->id, 'status' => 'SUCCESS', 'notify_token' => 'WRONG'])
            ->assertStatus(403);

        $this->postJson('/api/v1/webhooks/cinetpay/transfer', ['merchant_transaction_id' => $settlement->id, 'status' => 'SUCCESS', 'notify_token' => 'NT-1'])
            ->assertOk();
        $this->assertDatabaseHas('settlements', ['id' => $settlement->id, 'status' => 'paid']);
    }

    public function test_reversement_sans_numero_est_refuse(): void
    {
        Http::fake();
        $e = Establishment::factory()->create(['currency' => 'CDF']); // pas de payout_phone
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'X', 'student_matricule' => 'M', 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => 500, 'service_fee' => 0, 'commission' => 10, 'total' => 500,
            'currency' => 'CDF', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", [], $this->adminAuth())->assertStatus(422);
        $this->assertDatabaseCount('settlements', 0);
    }
}
