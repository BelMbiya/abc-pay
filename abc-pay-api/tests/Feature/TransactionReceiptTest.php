<?php

namespace Tests\Feature;

use App\Models\Receipt;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * Reçu complet (jeton d'authenticité) — réservé au TITULAIRE, pour re-générer le PDF+QR
 * depuis l'historique. Le `qr_token` est un secret jamais listé : seul le propriétaire
 * peut le récupérer pour SON reçu ; un tiers reçoit 403.
 */
class TransactionReceiptTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function auth(User $u): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($u)];
    }

    private function confirmedTxFor(User $u): Transaction
    {
        $tx = Transaction::create([
            'type' => 'tuition', 'user_id' => $u->id, 'student_name' => 'Grace', 'student_matricule' => 'M1',
            'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => 250, 'service_fee' => 0,
            'commission' => 5, 'total' => 250, 'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);
        Receipt::create(['transaction_id' => $tx->id, 'number' => 'RC-2026-00099', 'qr_token' => str_repeat('a', 48)]);

        return $tx;
    }

    public function test_le_titulaire_recupere_le_jeton_pour_son_recu(): void
    {
        $owner = User::factory()->create();
        $tx = $this->confirmedTxFor($owner);

        $res = $this->getJson("/api/v1/transactions/{$tx->id}/receipt", $this->auth($owner))->assertOk();
        $this->assertSame('RC-2026-00099', $res->json('data.number'));
        $this->assertSame(str_repeat('a', 48), $res->json('data.qr_token')); // secret livré au titulaire
    }

    public function test_un_tiers_ne_peut_pas_recuperer_le_jeton(): void
    {
        $owner = User::factory()->create();
        $tx = $this->confirmedTxFor($owner);
        $other = User::factory()->create();

        $this->getJson("/api/v1/transactions/{$tx->id}/receipt", $this->auth($other))->assertStatus(403);
    }
}
