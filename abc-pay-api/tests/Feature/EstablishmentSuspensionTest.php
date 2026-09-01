<?php

namespace Tests\Feature;

use App\Models\Establishment;
use App\Models\User;
use App\Services\Identity\JwtService;
use App\Services\Tenancy\EstablishmentProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * Un établissement suspendu (is_active=false) ne doit plus pouvoir se connecter,
 * ni accéder avec un jeton déjà émis, ni renouveler sa session.
 */
class EstablishmentSuspensionTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function provision(): array
    {
        $created = app(EstablishmentProvisioningService::class)->create([
            'name' => 'Ecole Test', 'type' => 'Institut supérieur',
            'login_email' => 'dir@test.cd', 'login_password' => 'secret123',
        ]);

        $user = User::where('email', 'dir@test.cd')->firstOrFail();
        // Comptes provisionnés = KYC requis + mot de passe à changer ; ces tests portent sur la
        // suspension → on considère le compte déjà initialisé (identité vérifiée, mot de passe changé).
        $user->forceFill(['kyc_status' => 'approved', 'must_change_password' => false])->save();

        return [Establishment::find($created['id']), $user];
    }

    public function test_connexion_refusee_si_etablissement_suspendu(): void
    {
        [$establishment] = $this->provision();
        $establishment->update(['is_active' => false]);

        // Établissement suspendu → 403 avec motif CLAIR (au lieu d'« identifiants invalides »).
        $res = $this->postJson('/api/v1/auth/staff/login', ['email' => 'dir@test.cd', 'password' => 'secret123'])
            ->assertStatus(403);
        $this->assertSame('account_blocked', $res->json('error.code'));
        $this->assertStringContainsString('suspendu', json_encode($res->json(), JSON_UNESCAPED_UNICODE));
    }

    public function test_acces_refuse_avec_jeton_existant_si_suspendu(): void
    {
        [$establishment, $user] = $this->provision();
        $token = app(JwtService::class)->issueStaffAccess($user, $establishment->id, 'direction');

        // Jeton valide tant que l'établissement est actif.
        $this->getJson('/api/v1/staff/dashboard', ['Authorization' => 'Bearer '.$token])->assertOk();

        // Suspension → accès gelé (403) même avec le jeton déjà émis.
        $establishment->update(['is_active' => false]);
        $this->getJson('/api/v1/staff/dashboard', ['Authorization' => 'Bearer '.$token])->assertStatus(403);
    }

    public function test_etablissement_ouvre_un_ticket(): void
    {
        [$establishment, $user] = $this->provision();
        $token = app(JwtService::class)->issueStaffAccess($user, $establishment->id, 'direction');

        $this->postJson('/api/v1/staff/support/tickets', [
            'category' => 'access', 'subject' => 'Problème caisse', 'message' => 'Impossible d\'encaisser ce matin.',
        ], ['Authorization' => 'Bearer '.$token])->assertCreated();
    }
}
