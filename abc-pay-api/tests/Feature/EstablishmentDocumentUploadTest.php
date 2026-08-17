<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * #2 — Dépôt (upload) des pièces KYB par l'établissement + téléchargement admin.
 * Fichiers sur disque PRIVÉ ('local') ; type validé contre le catalogue.
 */
class EstablishmentDocumentUploadTest extends TestCase
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

    public function test_staff_depose_une_piece_et_admin_la_telecharge(): void
    {
        Storage::fake('local');
        $e = Establishment::factory()->create();
        $staff = User::factory()->create();
        EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $staff->id, 'role' => 'direction']);

        $file = UploadedFile::fake()->create('rccm.pdf', 120, 'application/pdf');

        // Dépôt de la pièce RCCM (numéro + fichier).
        $this->post('/api/v1/staff/documents', [
            'type' => 'rccm', 'number' => 'CD/KIN/RCCM/24-B-1', 'file' => $file,
        ], $this->staffAuth($staff, $e->id))
            ->assertCreated()
            ->assertJsonPath('data.type', 'rccm')
            ->assertJsonPath('data.has_file', true)
            ->assertJsonPath('data.status', 'pending');

        Storage::disk('local')->assertExists("establishment-documents/{$e->id}/rccm.pdf");

        // L'aperçu staff montre la pièce fournie.
        $overview = $this->getJson('/api/v1/staff/documents', $this->staffAuth($staff, $e->id))->assertOk();
        $rccm = collect($overview->json('data.items'))->firstWhere('type', 'rccm');
        $this->assertTrue($rccm['provided']);

        // L'admin télécharge la pièce.
        $this->getJson("/api/v1/admin/establishments/{$e->id}/documents/rccm/file", $this->adminAuth())
            ->assertOk();
    }

    public function test_type_de_document_inconnu_est_refuse(): void
    {
        $e = Establishment::factory()->create();
        $staff = User::factory()->create();
        EstablishmentStaff::create(['establishment_id' => $e->id, 'user_id' => $staff->id, 'role' => 'direction']);

        $this->post('/api/v1/staff/documents', ['type' => 'carte_bancaire', 'number' => 'X'], $this->staffAuth($staff, $e->id))
            ->assertStatus(422);
    }
}
