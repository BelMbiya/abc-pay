<?php

namespace App\Services\Notification;

use App\Models\Learner;
use App\Models\Reminder;
use App\Models\UserNotification;

/**
 * Domaine Notification — relances + notifications in-app du payeur.
 * Trace tout ; l'envoi réel (SMS/email/push) sera branché sur le fournisseur.
 */
class NotificationService
{
    public function remindLearner(Learner $learner, string $channel = 'sms'): Reminder
    {
        // TODO : déclencher l'envoi réel via le fournisseur SMS/email.
        return Reminder::create([
            'establishment_id' => $learner->establishment_id,
            'learner_id' => $learner->id,
            'channel' => $channel,
            'sent_at' => now(),
        ]);
    }

    /**
     * Crée une notification in-app pour un utilisateur.
     *
     * @param  array<string, mixed>  $meta
     */
    public function notify(int $userId, string $type, string $level, string $title, ?string $body = null, array $meta = []): UserNotification
    {
        // TODO : push temps réel (WebSocket/FCM) — pour l'instant, le front interroge l'API.
        return UserNotification::create([
            'user_id' => $userId,
            'type' => $type,
            'level' => $level,   // success | error | info
            'title' => $title,
            'body' => $body,
            'meta' => $meta ?: null,
        ]);
    }

    /** @return array<int, array<string, mixed>> */
    public function listFor(int $userId, int $limit = 50): array
    {
        return UserNotification::where('user_id', $userId)->latest()->limit($limit)->get()
            ->map(fn (UserNotification $n) => [
                'id' => $n->id,
                'type' => $n->type,
                'level' => $n->level,
                'title' => $n->title,
                'body' => $n->body,
                'read' => $n->read_at !== null,
                'created_at' => $n->created_at?->toIso8601String(),
            ])->all();
    }

    public function unreadCount(int $userId): int
    {
        return (int) UserNotification::where('user_id', $userId)->whereNull('read_at')->count();
    }

    public function markAllRead(int $userId): void
    {
        UserNotification::where('user_id', $userId)->whereNull('read_at')->update(['read_at' => now()]);
    }
}
