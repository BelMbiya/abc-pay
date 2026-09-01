<?php

namespace Tests\Feature;

use App\Models\Transaction;
use App\Models\User;
use App\Services\Payment\RefundService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Remboursement au PAYEUR avec décaissement RÉEL (Mobile Money) via la passerelle active.
 * Prouve que l'approbation admin déclenche un vrai renvoi d'argent (Araka /sendmobilemoney),
 * et qu'un refus de la passerelle annule tout (le remboursement n'est PAS acté).
 */
class RefundDisbursementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        config([
            'payment.default_gateway' => 'araka',
            'araka.enabled' => true,
            'araka.transfer_enabled' => true,
            'araka.base_url' => 'https://araka-api-uat.azurewebsites.net',
            'araka.email' => 'merchant@abcpay.cd', 'araka.password' => 'secret',
        ]);
    }

    private function confirmedServiceTx(): Transaction
    {
        $user = User::factory()->create(['name' => 'Jean Payeur', 'phone' => '+243810000900']);

        return Transaction::create([
            'type' => 'service', 'direction' => 'debit', 'user_id' => $user->id,
            'payer_name' => 'Jean Payeur', 'payer_phone' => '+243810000001', // cible du renvoi
            'label' => 'SNEL Électricité', 'channel' => 'mpesa',
            'amount' => 20, 'service_fee' => 0, 'commission' => 0, 'total' => 20,
            'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(), 'reference' => 'CPT-9',
        ]);
    }

    public function test_remboursement_decaisse_reellement_au_payeur(): void
    {
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/api/pay/sendmobilemoney' => Http::response([
                'transactionId' => 'ARK-RF-1', 'statusCode' => '200', 'statusDescription' => 'SUCCESS',
            ]),
        ]);

        $tx = $this->confirmedServiceTx();
        $svc = app(RefundService::class);

        $refund = $svc->request($tx, 'Erreur de montant', 'admin-1', 'admin');
        $svc->adminDecide($refund, 'approuve', 'admin-1');

        // Transaction d'origine remboursée + mouvement crédit tracé avec l'id du transfert.
        $this->assertDatabaseHas('transactions', ['id' => $tx->id, 'status' => 'remboursee']);
        $credit = Transaction::where('type', 'refund')->where('direction', 'credit')->firstOrFail();
        $this->assertSame('araka', $credit->gateway);
        $this->assertSame('ARK-RF-1', $credit->gateway_ref);

        // Le renvoi a bien ciblé le numéro du payeur via MPESA.
        Http::assertSent(fn ($r) => str_contains($r->url(), '/sendmobilemoney')
            && ($r['destination']['provider'] ?? null) === 'MPESA'
            && ($r['destination']['walletID'] ?? null) === '+243810000001');
    }

    public function test_refus_passerelle_annule_le_remboursement(): void
    {
        Http::fake([
            '*/api/login' => Http::response(['token' => 'TOK', 'username' => 'x']),
            '*/api/pay/sendmobilemoney' => Http::response([
                'transactionId' => 'ARK-RF-2', 'statusCode' => '400', 'statusDescription' => 'DECLINED / Bad Request',
            ]),
        ]);

        $tx = $this->confirmedServiceTx();
        $svc = app(RefundService::class);
        $refund = $svc->request($tx, 'Erreur', 'admin-1', 'admin');

        try {
            $svc->adminDecide($refund, 'approuve', 'admin-1');
            $this->fail('Un refus de la passerelle aurait dû lever une ValidationException.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            $this->assertStringContainsString('passerelle', strtolower(json_encode($e->errors(), JSON_UNESCAPED_UNICODE)));
        }

        // Rollback TOTAL : transaction non remboursée, aucun mouvement crédit, demande encore ouverte.
        $this->assertDatabaseHas('transactions', ['id' => $tx->id, 'status' => 'confirmee']);
        $this->assertDatabaseMissing('transactions', ['type' => 'refund', 'direction' => 'credit']);
        $this->assertDatabaseHas('refunds', ['id' => $refund->id, 'status' => 'demande']);
    }

    public function test_sans_decaissement_auto_reste_un_acte_comptable(): void
    {
        // Décaissement OFF → aucun appel passerelle, remboursement comptable (comportement hérité).
        config(['araka.transfer_enabled' => false]);
        Http::fake();

        $tx = $this->confirmedServiceTx();
        $svc = app(RefundService::class);
        $refund = $svc->request($tx, 'Erreur', 'admin-1', 'admin');
        $svc->adminDecide($refund, 'approuve', 'admin-1');

        $this->assertDatabaseHas('transactions', ['id' => $tx->id, 'status' => 'remboursee']);
        Http::assertNothingSent();
    }
}
