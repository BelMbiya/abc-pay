<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class ProfileTest extends TestCase
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

    public function test_profil_incomplet_a_kyc_false(): void
    {
        $user = User::factory()->create(['name' => null]);
        $res = $this->getJson('/api/v1/me', $this->auth($user))->assertOk();
        $this->assertFalse($res->json('data.kyc_complete'));
    }

    public function test_mise_a_jour_profil_complete_le_kyc(): void
    {
        $user = User::factory()->create(['name' => null]);

        $res = $this->patchJson('/api/v1/me', [
            'name' => 'Grace Mbuyi', 'birth_date' => '1994-03-12', 'gender' => 'F',
            'address' => 'Av. de la Paix', 'city' => 'Kinshasa',
            'id_doc_type' => 'carte_electeur', 'id_doc_number' => 'CE-123456',
        ], $this->auth($user))->assertOk();

        $this->assertTrue($res->json('data.kyc_complete'));
        $this->assertSame('Grace Mbuyi', $res->json('data.name'));
        $this->assertSame('1994-03-12', $res->json('data.birth_date'));
        $this->assertNotNull($user->fresh()->profile_completed_at);
    }

    public function test_genre_invalide_rejete(): void
    {
        $user = User::factory()->create();
        $this->patchJson('/api/v1/me', ['gender' => 'X'], $this->auth($user))->assertStatus(422);
    }
}
