<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\Review;
use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class ReviewTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function userAuth(): array
    {
        $u = User::factory()->create(['name' => 'Grace Mbuyi']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($u)];
    }

    private function adminAuth(): array
    {
        $a = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($a)];
    }

    public function test_un_avis_est_soumis_en_attente_et_pas_encore_public(): void
    {
        $this->postJson('/api/v1/reviews', ['rating' => 5, 'message' => 'Service excellent et très rapide.', 'author_role' => 'Parent'], $this->userAuth())
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseHas('reviews', ['status' => 'pending', 'author_type' => 'user', 'author_name' => 'Grace Mbuyi']);
        $this->getJson('/api/v1/reviews/public')->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_apres_approbation_admin_lavis_devient_public(): void
    {
        $this->postJson('/api/v1/reviews', ['rating' => 5, 'message' => 'Très pratique pour régler la scolarité.'], $this->userAuth())->assertCreated();
        $review = Review::firstOrFail();

        $this->postJson("/api/v1/admin/reviews/{$review->id}/approve", [], $this->adminAuth())->assertOk();

        $this->getJson('/api/v1/reviews/public')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.message', 'Très pratique pour régler la scolarité.');
    }

    public function test_un_avis_invalide_est_refuse(): void
    {
        $this->postJson('/api/v1/reviews', ['rating' => 9, 'message' => 'x'], $this->userAuth())
            ->assertStatus(422);
    }
}
