<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * Envoi P2P RÉEL à 2 jambes via Araka : encaissement de l'EXPÉDITEUR (jambe 1, push) →
 * décaissement au DESTINATAIRE à la confirmation (jambe 2, sendmobilemoney). Échec de la
 * jambe 2 → REMBOURSEMENT automatique de l'expéditeur (aucun argent avalé).
 */
class SendViaGatewayTest extends TestCase
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
            'araka.transfer_enabled' => true,
            'araka.base_url' => 'https://araka-api-uat.azurewebsites.net',
            'araka.email' => 'merchant@abcpay.cd', 'araka.password' => 'secret',
            'araka.payment_page_id' => 'PP123',
        ]);
    }

    private function auth(User $u): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($u)];
    }

    public function test_envoi_p2p_encaisse_expediteur_puis_decaisse_destinataire(): void
    {
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/paymentrequest' => Http::response(['transactionId' => 'ARK-IN', 'statusCode' => '202', 'statusDescription' => 'ACCEPTED']),
            '*/transactionstatusbyreference/*' => Http::response([['status' => 'APPROVED', 'statusCode' => '200', 'transactionId' => 'ARK-IN']]),
            '*/api/pay/sendmobilemoney' => Http::response(['transactionId' => 'ARK-OUT', 'statusCode' => '200', 'statusDescription' => 'SUCCESS']),
        ]);

        $sender = User::factory()->create(['name' => 'Jean Expediteur', 'phone' => '+243810000900']);

        // Jambe 1 : encaissement de l'expéditeur → transaction en attente, push direct (pas d'URL).
        // SANS nom de destinataire (cas réel du formulaire) — ne doit PAS provoquer d'erreur interne.
        $res = $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 40, 'currency' => 'USD', 'channel' => 'mpesa',
            'counterparty_phone' => '+243810000001',
        ], $this->auth($sender))->assertCreated();

        $txId = $res->json('data.transaction.id');
        $this->assertSame('pending', $res->json('data.transaction.status'));
        $this->assertNull($res->json('data.payment_url'));

        // La confirmation (polling) déclenche la JAMBE 2 : décaissement au destinataire.
        $this->getJson("/api/v1/payments/{$txId}/status")->assertOk()->assertJsonPath('data.status', 'confirmee');
        $this->assertDatabaseHas('transactions', ['id' => $txId, 'status' => 'confirmee']);

        // sendmobilemoney a ciblé le DESTINATAIRE, opérateur MPESA déduit du préfixe 81.
        Http::assertSent(fn ($r) => str_contains($r->url(), '/sendmobilemoney')
            && ($r['destination']['walletID'] ?? null) === '+243810000001'
            && ($r['destination']['provider'] ?? null) === 'MPESA');
    }

    public function test_echec_decaissement_rembourse_l_expediteur(): void
    {
        $payoutCalls = 0;
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/paymentrequest' => Http::response(['transactionId' => 'ARK-IN', 'statusCode' => '202', 'statusDescription' => 'ACCEPTED']),
            '*/transactionstatusbyreference/*' => Http::response([['status' => 'APPROVED', 'statusCode' => '200', 'transactionId' => 'ARK-IN']]),
            '*/api/pay/sendmobilemoney' => function () use (&$payoutCalls) {
                $payoutCalls++;

                // 1er appel = décaissement destinataire → REFUSÉ ; 2e = remboursement expéditeur → OK.
                return $payoutCalls === 1
                    ? Http::response(['statusCode' => '400', 'statusDescription' => 'Transaction Failed'], 400)
                    : Http::response(['transactionId' => 'ARK-RF', 'statusCode' => '200', 'statusDescription' => 'SUCCESS']);
            },
        ]);

        $sender = User::factory()->create(['name' => 'Jean Expediteur', 'phone' => '+243810000900']);
        $res = $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 40, 'currency' => 'USD', 'channel' => 'mpesa',
            'counterparty_phone' => '+243810000001', 'counterparty_name' => 'Josué',
        ], $this->auth($sender))->assertCreated();
        $txId = $res->json('data.transaction.id');

        $this->getJson("/api/v1/payments/{$txId}/status")->assertOk();

        // Décaissement refusé → expéditeur remboursé → transaction « remboursee », 2 appels payout.
        $this->assertDatabaseHas('transactions', ['id' => $txId, 'status' => 'remboursee']);
        $this->assertSame(2, $payoutCalls);
    }
}
