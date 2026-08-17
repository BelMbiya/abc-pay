<?php

namespace Tests\Feature;

use App\Models\Admin;
use App\Models\User;
use App\Services\Identity\JwtService;
use App\Services\Notification\AdminNotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

/**
 * #11 — Fil de notifications opérationnelles du super-admin + audit des exceptions.
 * Vérifie : alerte support à l'ouverture d'un ticket, lecture/badge du fil admin,
 * et enveloppe uniforme `server_error` (sans fuite) pour toute exception non gérée.
 */
class AdminNotificationTest extends TestCase
{
    use RefreshDatabase, WithJwtKeys;

    protected function setUp(): void
    {
        parent::setUp();
        $this->configureJwtKeys();
    }

    private function payerAuth(User $u): array
    {
        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAccess($u)];
    }

    private function adminAuth(): array
    {
        $admin = Admin::firstOrCreate(['email' => 'hq@abcpay.cd'], ['name' => 'HQ', 'password' => 'secret123', 'role' => 'super_admin']);

        return ['Authorization' => 'Bearer '.app(JwtService::class)->issueAdminAccess($admin)];
    }

    public function test_ouverture_ticket_alerte_le_fil_admin(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/support/tickets', [
            'category' => 'dispute', 'subject' => 'Débit non reçu', 'message' => 'Mon envoi n\'est jamais arrivé.',
        ], $this->payerAuth($user))->assertCreated();

        $res = $this->getJson('/api/v1/admin/notifications', $this->adminAuth())->assertOk();

        $this->assertSame(1, $res->json('data.unread'));
        $this->assertSame('support', $res->json('data.notifications.0.type'));
        $this->assertStringContainsString('Nouveau ticket', $res->json('data.notifications.0.title'));
    }

    public function test_ticket_securite_urgent_est_critique(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/support/tickets', [
            'category' => 'compromised', 'subject' => 'Compte piraté', 'message' => 'Opérations inconnues.',
        ], $this->payerAuth($user))->assertCreated();

        $res = $this->getJson('/api/v1/admin/notifications', $this->adminAuth())->assertOk();
        $this->assertSame('critical', $res->json('data.notifications.0.level'));
    }

    public function test_marquer_lu_remet_le_badge_a_zero(): void
    {
        app(AdminNotificationService::class)->push('system', 'info', 'Test', 'corps');

        $this->postJson('/api/v1/admin/notifications/read', [], $this->adminAuth())->assertOk();

        $res = $this->getJson('/api/v1/admin/notifications', $this->adminAuth())->assertOk();
        $this->assertSame(0, $res->json('data.unread'));
    }

    public function test_le_fil_admin_exige_une_auth_admin(): void
    {
        $this->getJson('/api/v1/admin/notifications')->assertStatus(401);
    }

    public function test_exception_non_geree_renvoie_enveloppe_server_error_sans_fuite(): void
    {
        // Route jetable sur api/* qui lève une exception « brute » (message sensible).
        Route::get('/api/v1/_boom', function () {
            throw new \RuntimeException('SECRET_LEAK_dsn=postgres://user:pass@db');
        });

        $res = $this->getJson('/api/v1/_boom')->assertStatus(500);

        $this->assertSame('server_error', $res->json('error.code'));
        $this->assertStringNotContainsString('SECRET_LEAK', (string) $res->json('error.message'));

        // Une référence de corrélation est fournie (affichée à l'utilisateur ET loguée)
        // pour remonter la source/le type sans exposer la technique.
        $traceId = $res->json('error.trace_id');
        $this->assertNotEmpty($traceId);
        $this->assertStringContainsString((string) $traceId, (string) $res->json('error.message'));
    }
}
