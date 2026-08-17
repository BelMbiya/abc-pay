<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Reversement effectif abc pay → établissement (acte admin). */
class Settlement extends Model
{
    use HasUuids;

    protected $fillable = [
        'establishment_id', 'period_start', 'period_end',
        'gross', 'commission', 'net', 'currency', 'transactions_count',
        'status', 'reference', 'executed_by', 'paid_at',
        'gateway', 'gateway_transfer_id', 'notify_token',
    ];

    protected function casts(): array
    {
        return [
            'period_start' => 'date',
            'period_end' => 'date',
            'paid_at' => 'datetime',
            'gross' => 'decimal:2',
            'commission' => 'decimal:2',
            'net' => 'decimal:2',
            'transactions_count' => 'integer',
        ];
    }

    public function establishment(): BelongsTo
    {
        return $this->belongsTo(Establishment::class);
    }
}
