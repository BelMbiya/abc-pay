<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Faq;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/** Gestion de la FAQ (super-admin) + exposition publique (landing / page /faq). */
class FaqTest extends TestCase
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

    public function test_public_ne_voit_que_les_entrees_publiees_et_ordonnees(): void
    {
        Faq::create(['question' => 'B ?', 'answer' => 'rep B', 'position' => 2, 'is_published' => true]);
        Faq::create(['question' => 'A ?', 'answer' => 'rep A', 'position' => 1, 'is_published' => true]);
        Faq::create(['question' => 'Cachée ?', 'answer' => 'rep', 'position' => 0, 'is_published' => false]);

        $res = $this->getJson('/api/v1/faqs/public')->assertOk();

        $this->assertCount(2, $res->json('data'));
        $this->assertSame('A ?', $res->json('data.0.question')); // position 1 avant 2
        $this->assertSame('B ?', $res->json('data.1.question'));
    }

    public function test_admin_cree_modifie_et_supprime_une_entree(): void
    {
        $create = $this->postJson('/api/v1/admin/faqs', [
            'question' => 'Faut-il une app ?', 'answer' => 'Non, c\'est une web app.', 'category' => 'Général',
        ], $this->adminAuth())->assertCreated();

        $id = $create->json('data.id');

        $this->patchJson("/api/v1/admin/faqs/{$id}", ['is_published' => false], $this->adminAuth())->assertOk();
        $this->assertFalse((bool) Faq::find($id)->is_published);

        $this->deleteJson("/api/v1/admin/faqs/{$id}", [], $this->adminAuth())->assertOk();
        $this->assertNull(Faq::find($id));
    }

    public function test_creation_valide_les_champs(): void
    {
        $res = $this->postJson('/api/v1/admin/faqs', ['question' => ''], $this->adminAuth())->assertStatus(422);
        $this->assertSame('validation_failed', $res->json('error.code'));
    }

    public function test_la_gestion_faq_exige_une_auth_admin(): void
    {
        $this->getJson('/api/v1/admin/faqs')->assertStatus(401);
        $this->postJson('/api/v1/admin/faqs', ['question' => 'x', 'answer' => 'yyyyyyyy'])->assertStatus(401);
    }

    public function test_la_limite_d_affichage_faq_est_configurable(): void
    {
        for ($i = 1; $i <= 5; $i++) {
            Faq::create(['question' => "Q{$i} ?", 'answer' => "rep {$i}", 'position' => $i, 'is_published' => true]);
        }

        // Par défaut on en voit plusieurs ; après réglage à 2, la landing n'en montre que 2.
        $this->patchJson('/api/v1/admin/settings', ['landing_faq_limit' => 2], $this->adminAuth())->assertOk();

        $this->getJson('/api/v1/faqs/public')->assertOk()->assertJsonCount(2, 'data');
    }
}
