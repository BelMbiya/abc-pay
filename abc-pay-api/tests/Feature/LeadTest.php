<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Demandes de démo / partenariat depuis la landing (leads).
 */
class LeadTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $overrides = []): array
    {
        return array_merge([
            'establishment_name' => 'Collège Boboto',
            'contact_name' => 'Direction',
            'phone' => '+243810000000',
            'profile' => 'École (primaire / secondaire)',
            'message' => 'Nous voulons une démo Tuition.',
        ], $overrides);
    }

    public function test_la_landing_enregistre_une_demande_de_demo(): void
    {
        $this->postJson('/api/v1/leads', $this->payload())
            ->assertCreated()
            ->assertJsonPath('data.status', 'nouveau');

        $this->assertDatabaseHas('leads', [
            'establishment_name' => 'Collège Boboto',
            'source' => 'landing',
            'status' => 'nouveau',
        ]);
    }

    public function test_champs_obligatoires_valides(): void
    {
        $this->postJson('/api/v1/leads', $this->payload(['establishment_name' => '', 'phone' => '']))
            ->assertStatus(422);

        $this->assertDatabaseCount('leads', 0);
    }

    public function test_le_super_admin_liste_les_demandes(): void
    {
        $this->postJson('/api/v1/leads', $this->payload())->assertCreated();

        $admin = Admin::create(['name' => 'HQ', 'email' => 'hq@abcpay.cd', 'password' => 'secret123', 'role' => 'super_admin']);
        $token = app(JwtService::class)->issueAdminAccess($admin);

        $this->getJson('/api/v1/admin/leads', ['Authorization' => "Bearer {$token}"])
            ->assertOk()
            ->assertJsonPath('data.0.establishment_name', 'Collège Boboto');
    }
}
