<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Ticket de support / litige. PK uuid.
 * SÉCURITÉ : le statut et la réponse admin sont hors allowlist — réglés côté service admin.
 */
#[Fillable([
    'user_id', 'reference', 'category', 'subject', 'message', 'tx_reference', 'priority',
])]
class SupportTicket extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return ['resolved_at' => 'datetime'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
