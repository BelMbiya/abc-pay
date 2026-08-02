<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Signalement de fraude persisté (produit par FraudService). PK uuid.
 */
#[Fillable([
    'transaction_id', 'user_id', 'rule', 'severity', 'score', 'reason',
    'status', 'resolved_at', 'resolved_by',
])]
class FraudFlag extends Model
{
    use HasUuids;

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'resolved_at' => 'datetime',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
