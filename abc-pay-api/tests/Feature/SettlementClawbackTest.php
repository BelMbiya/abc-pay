<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\Settlement;
use App\Models\SettlementAdjustment;
use App\Models\Transaction;
use App\Services\Payment\RefundService;
use App\Services\Payment\SettlementService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * Politique de remboursement APRÈS reversement (clawback) : si l'établissement a déjà été
 * reversé pour une transaction remboursée, on crée une REPRISE déduite de son prochain
 * reversement. Si non encore reversée, aucune reprise (la tx remboursée sort du « à reverser »).
 */
class SettlementClawbackTest extends TestCase
{
    use RefreshDatabase;

    private function tuitionTx(Establishment $e, float $amount, string $mat): Transaction
    {
        return Transaction::create([
            'establishment_id' => $e->id, 'type' => 'tuition', 'direction' => 'debit',
            'student_name' => 'X', 'student_matricule' => $mat, 'fee_type' => 'Minerval',
            'channel' => 'mpesa', 'amount' => $amount, 'service_fee' => 0, 'commission' => 0,
            'total' => $amount, 'currency' => 'USD', 'status' => 'confirmee', 'confirmed_at' => now(),
        ]);
    }

    private function refund(Transaction $tx): void
    {
        $rf = app(RefundService::class);
        $r = $rf->request($tx, 'erreur de montant', 'staff-1', 'staff'); // l'établissement initie → validation N1
        $rf->adminDecide($r, 'approuve', 'admin-1');
    }

    public function test_remboursement_avant_reversement_ne_cree_pas_de_reprise(): void
    {
        $e = Establishment::factory()->create(['currency' => 'USD']);
        $tx = $this->tuitionTx($e, 100, 'M1'); // NON encore reversé
        $this->refund($tx);

        $this->assertDatabaseCount('settlement_adjustments', 0);
        // La transaction remboursée sort du « à reverser ».
        $this->assertSame(0.0, (float) app(SettlementService::class)->pendingFor($e->id)['gross']);
    }

    public function test_remboursement_apres_reversement_cree_une_reprise_deduite_du_prochain(): void
    {
        $e = Establishment::factory()->create(['currency' => 'USD']);
        $tx = $this->tuitionTx($e, 100, 'M1');
        app(SettlementService::class)->execute($e, 'REV-1', 'admin'); // reversé (acte comptable en test)
        $tx->refresh();
        $this->assertNotNull($tx->settlement_id);

        $this->refund($tx); // remboursement d'une tx DÉJÀ reversée → reprise
        $this->assertSame(100.0, (float) SettlementAdjustment::where('establishment_id', $e->id)->whereNull('settlement_id')->sum('amount'));

        // Nouveaux encaissements 150 → prochain reversement = 150 − 100 = 50.
        $this->tuitionTx($e, 150, 'M2');
        $p = app(SettlementService::class)->pendingFor($e->id);
        $this->assertSame(150.0, (float) $p['gross']);
        $this->assertSame(100.0, (float) $p['clawback']);
        $this->assertSame(50.0, (float) $p['net']);

        $s = app(SettlementService::class)->execute($e, 'REV-2', 'admin');
        $this->assertSame(50.0, (float) $s->net);
        $this->assertSame(100.0, (float) $s->clawback);
        // Reprise appliquée : plus aucune en attente.
        $this->assertDatabaseMissing('settlement_adjustments', ['establishment_id' => $e->id, 'settlement_id' => null]);
    }

    public function test_reprise_superieure_bloque_le_reversement(): void
    {
        $e = Establishment::factory()->create(['currency' => 'USD']);
        $tx = $this->tuitionTx($e, 100, 'M1');
        app(SettlementService::class)->execute($e, 'REV-1', 'admin');
        $tx->refresh();
        $this->refund($tx); // reprise de 100

        $this->tuitionTx($e, 50, 'M2'); // 50 à reverser < reprise 100
        try {
            app(SettlementService::class)->execute($e, 'REV-2', 'admin');
            $this->fail('Un net négatif aurait dû bloquer le reversement.');
        } catch (ValidationException $ex) {
            $this->assertStringContainsString('Reprise', json_encode($ex->errors(), JSON_UNESCAPED_UNICODE));
        }
        // Aucun 2e reversement ; la reprise reste en attente.
        $this->assertSame(1, Settlement::where('establishment_id', $e->id)->count());
        $this->assertDatabaseHas('settlement_adjustments', ['establishment_id' => $e->id, 'settlement_id' => null]);
    }
}
