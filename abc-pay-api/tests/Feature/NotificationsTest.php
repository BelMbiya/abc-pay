<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\Identity\JwtService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\WithJwtKeys;
use Tests\TestCase;

class NotificationsTest extends TestCase
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

    public function test_envoi_reussi_notifie_le_destinataire(): void
    {
        $sender = User::factory()->create(['name' => 'Grace', 'phone' => '+243810000020']);
        $recipient = User::factory()->create(['phone' => '+243810000021']);

        $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 30, 'channel' => 'mpesa', 'counterparty_phone' => '+243810000021',
        ], $this->auth($sender))->assertCreated();

        // Le destinataire a une notification "Argent reçu" (succès, non lue).
        $res = $this->getJson('/api/v1/notifications', $this->auth($recipient))->assertOk();
        $this->assertSame(1, $res->json('data.unread'));
        $this->assertSame('Argent reçu', $res->json('data.notifications.0.title'));
        $this->assertSame('success', $res->json('data.notifications.0.level'));
    }

    public function test_envoi_echoue_notifie_l_expediteur_avec_la_raison(): void
    {
        $sender = User::factory()->create();

        // Au-delà du plafond → échec.
        $res = $this->postJson('/api/v1/transactions', [
            'type' => 'send', 'amount' => 20000, 'channel' => 'mpesa', 'counterparty_phone' => '+243810000099',
        ], $this->auth($sender))->assertCreated();

        $this->assertSame('echouee', $res->json('data.transaction.status'));
        $this->assertStringContainsString('Plafond', $res->json('data.transaction.failure_reason'));

        $n = $this->getJson('/api/v1/notifications', $this->auth($sender))->assertOk();
        $this->assertSame('error', $n->json('data.notifications.0.level'));
        $this->assertStringContainsString('Plafond', $n->json('data.notifications.0.body'));
    }

    public function test_paiement_tuition_notifie_le_staff_de_l_etablissement(): void
    {
        // Établissement + compte de connexion « direction » (staff).
        $created = app(\App\Services\Tenancy\EstablishmentProvisioningService::class)->create([
            'name' => 'Ecole Test', 'type' => 'Institut supérieur',
            'login_email' => 'dir@test.cd', 'login_password' => 'secret123',
        ]);
        $staff = User::where('email', 'dir@test.cd')->firstOrFail();

        // Paiement Tuition (payeur non connecté).
        $this->postJson('/api/v1/payments', [
            'establishment_id' => $created['id'], 'student_name' => 'Jean',
            'student_matricule' => 'M-1', 'fee_type' => 'Minerval', 'channel' => 'mpesa', 'amount' => 100,
        ])->assertCreated();

        // Le staff voit l'encaissement dans SA cloche.
        $res = $this->getJson('/api/v1/notifications', $this->auth($staff))->assertOk();
        $this->assertSame(1, $res->json('data.unread'));
        $this->assertSame('Nouveau paiement encaissé', $res->json('data.notifications.0.title'));
    }

    public function test_marquer_comme_lu(): void
    {
        $user = User::factory()->create();
        $this->postJson('/api/v1/transactions', ['type' => 'service', 'amount' => 10, 'channel' => 'mpesa', 'label' => 'SNEL'], $this->auth($user))->assertCreated();

        $this->assertSame(1, $this->getJson('/api/v1/notifications', $this->auth($user))->json('data.unread'));
        $this->postJson('/api/v1/notifications/read', [], $this->auth($user))->assertOk();
        $this->assertSame(0, $this->getJson('/api/v1/notifications', $this->auth($user))->json('data.unread'));
    }
}
