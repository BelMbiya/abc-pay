<?php

namespace App\Services\Notification;

use App\Models\AdminNotification;

/**
 * Domaine Notification — fil OPÉRATIONNEL du super-admin (fraude / support / système).
 *
 * Découplé de {@see NotificationService} (payeur/staff) car la cible n'est pas un `User`
 * mais l'équipe admin dans son ensemble. SRP : la création/lecture du fil admin est isolée
 * ici, hors contrôleur. Best-effort : `push()` ne doit jamais casser le flux métier appelant
 * (paiement, ticket) — les appelants qui poussent depuis un chemin critique enveloppent l'appel.
 */
class AdminNotificationService
{
    /**
     * Ajoute une alerte au fil admin.
     *
     * @param  string  $type   fraud | support | system
     * @param  string  $level  info | warning | critical
     * @param  array<string, mixed>  $meta
     */
    public function push(string $type, string $level, string $title, ?string $body = null, array $meta = []): AdminNotification
    {
        return AdminNotification::create([
            'type' => $type,
            'level' => $level,
            'title' => $title,
            'body' => $body,
            'meta' => $meta ?: null,
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    public function latest(int $limit = 50): array
    {
        return AdminNotification::query()->latest()->limit($limit)->get()
            ->map(fn (AdminNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'level' => $n->level,
                'title' => $n->title,
                'body' => $n->body,
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at?->toIso8601String(),
            ])->all();
    }

    public function unreadCount(): int
    {
        return (int) AdminNotification::whereNull('read_at')->count();
    }

    public function markAllRead(): void
    {
        AdminNotification::whereNull('read_at')->update(['read_at' => now()]);
    }
}
