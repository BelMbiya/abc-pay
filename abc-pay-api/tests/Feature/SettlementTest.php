<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\Settlement;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * #11/#12 — Reversements RÉELS abc pay → établissement.
 * L'admin exécute le reversement des encaissements en attente : une ligne figée est
 * créée, les transactions sont soldées (statut « en attente » → « reversé »), et
 * l'établissement le voit dans son onglet. Fini le calcul hebdomadaire « à la volée ».
 */
class SettlementTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function adminAuth(): array
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
    }

    private function staffAuth(User $u, string $establishmentId): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueStaffAccess($u, $establishmentId, 'direction')];
    }

    private function confirmedTx(Establishment $e, float $amount, float $commission): void
    {
        Transaction::create([
            'establishment_id' => $e->id, 'student_name' => 'Jean', 'student_matricule' => 'M-'.$amount,
            'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => $amount, 'service_fee' => 0,
            'commission' => $commission, 'total' => $amount, 'currency' => 'USD',
            'status' => 'confirmee', 'confirmed_at' => now(),
        ]);
    }

    public function test_admin_execute_le_reversement_et_le_statut_change(): void
    {
        $e = Establishment::factory()->create(['currency' => 'USD']);
        $staffUser = User::factory()->create();
        EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $staffUser->id, 'role' => 'direction']);

        // Deux encaissements confirmés : net = 100+50 = 150 (frais chez le payeur, montant plein reversé).
        $this->confirmedTx($e, 100, 2);
        $this->confirmedTx($e, 50, 1);

        // Côté établissement : 150 en attente, aucune ligne « reversé ».
        $before = $this->getJson('/api/v1/staff/settlements', $this->staffAuth($staffUser, $e->id))->assertOk();
        $this->assertSame(150.0, (float) $before->json('data.pending_net'));
        $this->assertSame('pending', $before->json('data.settlements.0.status'));
        $this->assertSame(0.0, (float) $before->json('data.total_net'));

        // Côté admin : voit l'en-attente puis EXÉCUTE le reversement.
        $this->getJson("/api/v1/admin/establishments/{$e->id}/settlements", $this->adminAuth())
            ->assertOk()->assertJsonPath('data.pending.net', 150);

        $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", ['reference' => 'MP-2026-001'], $this->adminAuth())
            ->assertCreated()
            ->assertJsonPath('data.net', 150)
            ->assertJsonPath('data.transactions_count', 2)
            ->assertJsonPath('data.status', 'paid');

        // La ligne est figée et les transactions sont soldées.
        $this->assertDatabaseCount('settlements', 1);
        $settlement = Settlement::first();
        $this->assertSame(0, Transaction::whereNull('settlement_id')->count());
        $this->assertSame(2, Transaction::where('settlement_id', $settlement->id)->count());

        // Côté établissement : plus rien en attente, une ligne « reversé » de 150.
        $after = $this->getJson('/api/v1/staff/settlements', $this->staffAuth($staffUser, $e->id))->assertOk();
        $this->assertSame(0.0, (float) $after->json('data.pending_net'));
        $this->assertSame(150.0, (float) $after->json('data.total_net'));
        $this->assertSame('paid', $after->json('data.settlements.0.status'));
        $this->assertSame('MP-2026-001', $after->json('data.settlements.0.reference'));

        // L'établissement est notifié du reversement.
        $notif = $this->getJson('/api/v1/notifications', ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($staffUser)])->assertOk();
        $this->assertSame('Reversement effectué', $notif->json('data.notifications.0.title'));
    }

    public function test_rien_a_reverser_renvoie_422(): void
    {
        $e = Establishment::factory()->create();

        $this->postJson("/api/v1/admin/establishments/{$e->id}/settlements", [], $this->adminAuth())
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'nothing_to_settle');

        $this->assertDatabaseCount('settlements', 0);
    }
}
