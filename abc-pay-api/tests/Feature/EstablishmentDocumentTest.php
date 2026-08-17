<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * #3 — Documents KYB (RDC) d'un établissement/marchand : RCCM, Id. Nat., NIF,
 * siège, pièce du responsable, agrément ministère. Collecte à l'onboarding + revue admin.
 */
class EstablishmentDocumentTest extends TestCase
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

    public function test_onboarding_collecte_les_documents_puis_revue_admin(): void
    {
        // Onboarding avec numéros de documents RDC.
        $created = $this->postJson('/api/v1/admin/establishments', [
            'name' => 'Université Test', 'type' => 'Université', 'city' => 'Kinshasa',
            'login_email' => 'dir@utest.cd', 'login_password' => 'secret123',
            'rccm_number' => 'CD/KIN/RCCM/24-B-1234', 'id_nat_number' => '01-K-9999', 'nif_number' => 'A1234567Z',
        ], $this->adminAuth())->assertCreated();

        $id = $created->json('data.id');

        // Aperçu : catalogue complet, 3 pièces fournies (pending), reste manquant, non complet.
        $overview = $this->getJson("/api/v1/admin/establishments/{$id}/documents", $this->adminAuth())->assertOk();
        $items = collect($overview->json('data.items'));
        $this->assertTrue($items->firstWhere('type', 'rccm')['provided']);
        $this->assertSame('pending', $items->firstWhere('type', 'rccm')['status']);
        $this->assertSame('missing', $items->firstWhere('type', 'manager_id')['status']);
        // Université ⇒ le document scolaire (agrément ministère) est applicable.
        $this->assertNotNull($items->firstWhere('type', 'ministry_approval'));
        $this->assertFalse($overview->json('data.completeness.complete'));

        // L'admin approuve le RCCM.
        $this->postJson("/api/v1/admin/establishments/{$id}/documents", [
            'type' => 'rccm', 'status' => 'approved',
        ], $this->adminAuth())
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $after = $this->getJson("/api/v1/admin/establishments/{$id}/documents", $this->adminAuth())->assertOk();
        $this->assertSame('approved', collect($after->json('data.items'))->firstWhere('type', 'rccm')['status']);
        $this->assertSame(1, $after->json('data.completeness.approved'));
    }

    public function test_type_de_document_hors_catalogue_est_refuse(): void
    {
        $e = Establishment::factory()->create();

        $this->postJson("/api/v1/admin/establishments/{$e->id}/documents", [
            'type' => 'carte_bancaire', 'status' => 'approved',
        ], $this->adminAuth())->assertStatus(422);
    }

    public function test_documents_admin_inaccessibles_sans_jeton_admin(): void
    {
        $e = Establishment::factory()->create();

        $this->getJson("/api/v1/admin/establishments/{$e->id}/documents")->assertStatus(401);
    }
}
