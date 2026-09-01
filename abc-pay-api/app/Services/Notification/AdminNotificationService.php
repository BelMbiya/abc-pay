<?php

namespace App\Services\Notification;

use App\Models\AdminNotification;
use App\Models\AdminNotificationRead;

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

    /**
     * Fil récent avec l'état « lu » PROPRE à cet administrateur (le fil est partagé, mais
     * le lu/non-lu est individuel).
     *
     * @return array<int, array<string, mixed>>
     */
    public function latest(string $adminId, int $limit = 50): array
    {
        $read = AdminNotificationRead::where('admin_id', $adminId)->pluck('admin_notification_id')->flip();

        return AdminNotification::query()->latest()->limit($limit)->get()
            ->map(fn (AdminNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'level' => $n->level,
                'title' => $n->title,
                'body' => $n->body,
                'read' => $read->has($n->id),
                'created_at' => $n->created_at?->toIso8601String(),
            ])->all();
    }

    /** Nombre de notifications que CET admin n'a pas encore lues. */
    public function unreadCount(string $adminId): int
    {
        return (int) AdminNotification::whereNotExists(fn ($q) => $q
            ->selectRaw('1')->from('admin_notification_reads')
            ->whereColumn('admin_notification_reads.admin_notification_id', 'admin_notifications.id')
            ->where('admin_notification_reads.admin_id', $adminId))
            ->count();
    }

    /** Marque tout comme lu POUR CET admin (n'affecte pas les autres). */
    public function markAllRead(string $adminId): void
    {
        $unread = AdminNotification::whereNotExists(fn ($q) => $q
            ->selectRaw('1')->from('admin_notification_reads')
            ->whereColumn('admin_notification_reads.admin_notification_id', 'admin_notifications.id')
            ->where('admin_notification_reads.admin_id', $adminId))
            ->pluck('id');

        if ($unread->isEmpty()) {
            return;
        }

        $now = now();
        AdminNotificationRead::insert($unread->map(fn ($id) => [
            'admin_id' => $adminId,
            'admin_notification_id' => $id,
            'read_at' => $now,
        ])->all());
    }
}
