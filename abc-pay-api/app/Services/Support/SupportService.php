<?php

namespace App\Services\Support;

use App\Models\SupportTicket;
use App\Models\User;
use App\Services\Notification\AdminNotificationService;
use App\Services\Notification\NotificationService;
use Illuminate\Support\Facades\DB;

/**
 * Domaine Support — tickets & litiges + politiques de sécurité de compte.
 *
 * Politique clé : un signalement « compte usurpé » ou « appareil perdu » GÈLE
 * immédiatement le compte (blocage + révocation de toutes les sessions), en plus
 * de créer un ticket urgent. Le titulaire ne pourra rouvrir qu'après vérification
 * auprès du support (déblocage par un admin). SRP : hors contrôleur.
 */
class SupportService
{
    /** Catégories déclenchant un gel automatique du compte. */
    private const AUTO_FREEZE = ['compromised', 'lost_device'];

    public function __construct(
        private readonly AdminNotificationService $adminNotify,
        private readonly NotificationService $notify,
    ) {}

    /**
     * Ouvre un ticket pour l'utilisateur. Déclenche le gel si catégorie de sécurité.
     *
     * @param  array<string, mixed>  $data
     */
    public function open(User $user, array $data): array
    {
        $ticket = DB::transaction(function () use ($user, $data) {
            $freeze = in_array($data['category'], self::AUTO_FREEZE, true);

            $ticket = SupportTicket::create([
                'user_id' => $user->id,
                'reference' => $this->nextReference(),
                'category' => $data['category'],
                'subject' => $data['subject'],
                'message' => $data['message'],
                'tx_reference' => $data['tx_reference'] ?? null,
                'priority' => $freeze ? 'urgent' : ($data['priority'] ?? 'normal'),
            ]);

            if ($freeze) {
                $this->freeze($user, 'Compte gelé suite à un signalement de sécurité ('.$data['category'].').');
            }

            return $ticket->fresh();
        });

        // Alerte admin hors transaction (best-effort : ne casse jamais l'ouverture du ticket).
        $this->alertAdmins($ticket);

        return $this->present($ticket);
    }

    /**
     * Bouton « Bloquer mon compte » (self-service, immédiat) : gèle le compte
     * ET crée un ticket urgent. Le titulaire est déconnecté partout à l'instant.
     */
    public function panic(User $user): array
    {
        $ticket = DB::transaction(function () use ($user) {
            $this->freeze($user, 'Compte bloqué par son titulaire (mesure de sécurité).');

            $ticket = SupportTicket::create([
                'user_id' => $user->id,
                'reference' => $this->nextReference(),
                'category' => 'compromised',
                'subject' => 'Compte bloqué par le titulaire',
                'message' => 'Le titulaire a demandé le blocage immédiat de son compte (appareil perdu / accès suspect). Déblocage après vérification d\'identité.',
                'priority' => 'urgent',
            ]);

            return $ticket->fresh();
        });

        $this->alertAdmins($ticket);

        return $this->present($ticket);
    }

    /** Gel : blocage + révocation de toutes les sessions (affectation explicite, hors allowlist). */
    private function freeze(User $user, string $reason): void
    {
        $user->is_blocked = true;
        $user->blocked_reason = $reason;
        $user->sessions_revoked_at = now();
        $user->save();
    }

    /** Tickets de l'utilisateur (les plus récents d'abord). */
    public function listForUser(User $user): array
    {
        return SupportTicket::where('user_id', $user->id)->latest()->limit(100)->get()
            ->map(fn (SupportTicket $t) => $this->present($t))->all();
    }

    /** Tous les tickets (admin), filtrables par statut. */
    public function listAll(?string $status = null, int $limit = 300): array
    {
        $q = SupportTicket::query()->with('user:id,name,phone')->latest();
        if ($status) {
            $q->where('status', $status);
        }

        return $q->limit($limit)->get()->map(fn (SupportTicket $t) => $this->present($t, true))->all();
    }

    public function openCount(): int
    {
        return SupportTicket::where('status', 'open')->count();
    }

    /**
     * Traitement admin : réponse + changement de statut.
     *
     * @param  array<string, mixed>  $data
     */
    public function respond(SupportTicket $ticket, array $data, string $by): array
    {
        if (! empty($data['response'])) {
            $ticket->admin_response = $data['response'];
        }
        if (! empty($data['status'])) {
            $ticket->status = $data['status'];
        }
        if ($ticket->status === 'resolved') {
            $ticket->resolved_at = now();
            $ticket->resolved_by = $by;
        }
        $ticket->save();

        // Prévient le titulaire qu'une réponse est disponible (comble un angle mort UX).
        if (! empty($data['response']) && $ticket->user_id) {
            try {
                $this->notify->notify(
                    userId: $ticket->user_id,
                    type: 'support',
                    level: 'info',
                    title: 'Réponse du support · '.$ticket->reference,
                    body: $ticket->status === 'resolved' ? 'Votre demande a été traitée.' : 'Le support a répondu à votre demande.',
                    meta: ['ticket_id' => $ticket->id, 'reference' => $ticket->reference],
                );
            } catch (\Throwable) {
                // silencieux : la réponse admin est déjà enregistrée.
            }
        }

        return $this->present($ticket->fresh('user'), true);
    }

    /** Alerte le fil admin à l'ouverture d'un ticket (best-effort). */
    private function alertAdmins(SupportTicket $ticket): void
    {
        try {
            $urgent = $ticket->priority === 'urgent';
            $this->adminNotify->push(
                type: 'support',
                level: $urgent ? 'critical' : 'warning',
                title: ($urgent ? 'Ticket URGENT · ' : 'Nouveau ticket · ').$ticket->reference,
                body: $ticket->subject,
                meta: ['ticket_id' => $ticket->id, 'reference' => $ticket->reference, 'category' => $ticket->category],
            );
        } catch (\Throwable) {
            // silencieux : le ticket est déjà ouvert, l'alerte est secondaire.
        }
    }

    /** Numérotation lisible TCK-AAAA-NNNNN. */
    private function nextReference(): string
    {
        return 'TCK-'.now()->format('Y').'-'.str_pad((string) (SupportTicket::count() + 1), 5, '0', STR_PAD_LEFT);
    }

    /** DTO ticket. `$withUser` = inclut l'auteur (vue admin). */
    private function present(SupportTicket $t, bool $withUser = false): array
    {
        $row = [
            'id' => $t->id,
            'reference' => $t->reference,
            'category' => $t->category,
            'subject' => $t->subject,
            'message' => $t->message,
            'tx_reference' => $t->tx_reference,
            'priority' => $t->priority,
            'status' => $t->status,
            'admin_response' => $t->admin_response,
            'resolved_by' => $t->resolved_by,
            'created_at' => $t->created_at?->toIso8601String(),
        ];

        if ($withUser) {
            $row['user'] = $t->user ? ['id' => $t->user->id, 'name' => $t->user->name, 'phone' => $t->user->phone] : null;
        }

        return $row;
    }
}
