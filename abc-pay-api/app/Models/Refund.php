<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Demande de remboursement rattachée à une transaction. Cycle : demande → approuve|rejete.
 */
class Refund extends Model
{
    use HasUuids;

    protected $fillable = [
        'transaction_id', 'establishment_id', 'amount', 'currency', 'reason', 'status',
        'needs_establishment', 'establishment_decision', 'establishment_decided_by', 'establishment_decided_at',
        'requested_by', 'decided_by', 'decision_note', 'decided_at', 'forced', 'force_reason',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'decided_at' => 'datetime',
            'establishment_decided_at' => 'datetime',
            'needs_establishment' => 'boolean',
            'forced' => 'boolean',
        ];
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(Transaction::class);
    }
}
