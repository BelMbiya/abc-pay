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
            'cinetpay.transfer_enabled' => true, // reversement automatique (transfert réel) activé
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

    public function test_paiement_service_via_cinetpay_pending_puis_confirme_par_statut(): void
    {
        Http::fake([
            '*/oauth/login' => Http::response(['code' => 200, 'status' => 'OK', 'access_token' => 'TOK', 'token_type' => 'bearer', 'expires_in' => 86400]),
            '*/payment/*' => Http::response(['code' => 100, 'status' => 'SUCCESS', 'merchant_transaction_id' => 'REF', 'transaction_id' => 'CP-1']), // GET statut
            '*/payment' => Http::response(['code' => 200, 'status' => 'OK', 'payment_url' => 'https://secure.cinetpay.net/checkout/svc', 'payment_token' => 'PTOK', 'transaction_id' => 'CP-1', 'notify_token' => 'NT-1', 'merchant_transaction_id' => 'REF']), // POST init
        ]);

        $user = User::factory()->create(['name' => 'Jean Kabila', 'phone' => '+243810000700']);
        $auth = ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($user)];

        // Init : transaction de service en attente + URL de paiement (opérateur verrouillé).
        $res = $this->postJson('/api/v1/transactions', [
            'type' => 'service', 'amount' => 15, 'currency' => 'USD', 'channel' => 'mpesa',
            'label' => 'SNEL Électricité', 'reference' => 'CPT-123',
        ], $auth)->assertCreated();

        $txId = $res->json('data.transaction.id');
        $this->assertSame('pending', $res->json('data.transaction.status'));
        $this->assertSame('https://secure.cinetpay.net/checkout/svc', $res->json('data.payment_url'));

        $tx = Transaction::find($txId);
        $this->assertSame('cinetpay', $tx->gateway);
        $this->assertSame('service', $tx->type);
        $this->assertNotNull($tx->gateway_ref);

        // PAGE DE RETOUR (vérif active) : confirme via le STATUT CinetPay (dispatch par type).
        $status = $this->getJson("/api/v1/payments/{$txId}/status")->assertOk();
        $this->assertSame('confirmee', $status->json('data.status'));
        $this->assertDatabaseHas('transactions', ['id' => $txId, 'status' => 'confirmee', 'type' => 'service']);
        $this->assertDatabaseHas('receipts', ['transaction_id' => $txId]);
    }

    public function test_montant_sous_le_minimum_est_refuse_avant_cinetpay(): void
    {
        config(['cinetpay.min_amount' => 100]);
        Http::fake(); // aucun appel ne doit partir (garde-fou avant CinetPay)

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [250], 'currency' => 'USD']);
        $payload = $this->paymentPayload($e);
        $payload['amount'] = 10; // sous le minimum CinetPay

        $res = $this->postJson('/api/v1/payments', $payload)->assertStatus(422);
        $body = json_encode($res->json(), JSON_UNESCAPED_UNICODE);
        $this->assertStringContainsString('montant minimum', $body);
        $this->assertDatabaseCount('transactions', 0);
        Http::assertNothingSent();
    }

    public function test_numero_incoherent_avec_operateur_est_refuse_avant_cinetpay(): void
    {
        Http::fake(); // aucun appel ne doit partir (validation avant CinetPay)

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [250], 'currency' => 'USD']);
        // Canal AIRTEL mais numéro M-Pesa (préfixe 81) → incohérence détectée localement.
        $payload = $this->paymentPayload($e);
        $payload['channel'] = 'airtel';
        $payload['payer_phone'] = '+243815858586';

        $res = $this->postJson('/api/v1/payments', $payload)->assertStatus(422);
        $body = json_encode($res->json(), JSON_UNESCAPED_UNICODE);
        $this->assertStringContainsString('Airtel', $body);
        $this->assertStringContainsString('opérateur', $body);
        $this->assertDatabaseCount('transactions', 0); // rollback : rien de créé
        Http::assertNothingSent(); // zéro appel CinetPay gaspillé
    }

    public function test_erreur_cinetpay_est_remontee_lisiblement(): void
    {
        // CinetPay refuse (ex. IP non whitelistée : code 2011 NOT_ALLOWED).
        Http::fake([
            '*/oauth/login' => Http::response(['code' => 200, 'status' => 'OK', 'access_token' => 'TOK', 'expires_in' => 86400]),
            '*/payment' => Http::response(['code' => 2011, 'status' => 'NOT_ALLOWED', 'description' => 'This Ip is not withlisted'], 422),
        ]);

        $e = Establishment::factory()->create(['fees' => ['Minerval'], 'presets' => [250], 'currency' => 'CDF']);

        // Le motif CinetPay remonte (422), PAS un 500 opaque, et aucune transaction fantôme.
        // Cas IP non whitelistée (2011 / NOT_ALLOWED) → message ACTIONNABLE (whitelist IP).
        $res = $this->postJson('/api/v1/payments', $this->paymentPayload($e))->assertStatus(422);
        $body = json_encode($res->json(), JSON_UNESCAPED_UNICODE);
        $this->assertStringContainsString('CinetPay', $body);
        $this->assertStringContainsString('IP publique', $body);
        $this->assertStringContainsString('autorisée', $body);
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

    public function test_reversement_cinetpay_succes_immediat_est_marque_paye(): void
    {
        // Le transfert RDC réussit immédiatement (code 100 SUCCESS) → « payé » tout de suite,
        // sans attendre le webhook (indispensable en local).
        Http::fake([
            '*/oauth/login' => Http::response(['code' => 200, 'status' => 'OK', 'access_token' => 'TOK', 'expires_in' => 86400]),
            '*/transfer' => Http::response(['code' => 100, 'status' => 'SUCCESS', 'transaction_id' => 'CPT-2', 'notify_token' => 'NT-2']),
        ]);

        $e = Establishment::factory()->create(['currency' => 'USD', 'payout_phone' => '+243810000700', 'payout_method' => 'MPESA_CD']);
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'Grace', 'student_matricule' => 'M1', 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => 250, 'service_fee' => 0, 'commission' => 3.75, 'total' => 250,
            'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", ['reference' => 'REV-2'], $this->adminAuth())
            ->assertCreated()
            ->assertJsonPath('data.status', 'paid'); // succès immédiat → payé

        $settlement = Settlement::where('establishment_id', $e->id)->firstOrFail();
        $this->assertSame('paid', $settlement->status);
        $this->assertNotNull($settlement->paid_at);
        $this->assertSame('CPT-2', $settlement->gateway_transfer_id);
    }

    public function test_reversement_mode_enregistrement_quand_transfert_auto_off(): void
    {
        // Reversement automatique OFF (défaut) : acte comptable → « payé » immédiatement,
        // AUCUN appel CinetPay, et le numéro de reversement n'est PAS requis.
        config(['cinetpay.transfer_enabled' => false]);
        Http::fake();

        $e = Establishment::factory()->create(['currency' => 'USD']); // pas de payout_phone
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'Grace', 'student_matricule' => 'M1', 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => 1600, 'service_fee' => 0, 'commission' => 24, 'total' => 1600,
            'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", ['reference' => 'REV-X'], $this->adminAuth())
            ->assertCreated()
            ->assertJsonPath('data.status', 'paid');

        $settlement = Settlement::where('establishment_id', $e->id)->firstOrFail();
        $this->assertNotNull($settlement->paid_at);
        Http::assertNothingSent(); // aucun transfert CinetPay en mode enregistrement
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

    public function test_reversement_bloque_pour_etablissement_suspendu(): void
    {
        // Un établissement SUSPENDU ne peut plus recevoir de reversement (fonds gelés).
        config(['cinetpay.transfer_enabled' => false]); // isole du chemin transfert
        Http::fake();
        $e = Establishment::factory()->create(['currency' => 'USD', 'is_active' => false]);
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'X', 'student_matricule' => 'M', 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => 500, 'service_fee' => 0, 'commission' => 10, 'total' => 500,
            'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);

        $res = $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", ['reference' => 'REV-SUSP'], $this->adminAuth())
            ->assertStatus(422);
        $this->assertStringContainsString('suspendu', strtolower(json_encode($res->json(), JSON_UNESCAPED_UNICODE)));
        $this->assertDatabaseCount('settlements', 0); // rien reversé
    }
}
