<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Transaction extends Model
{
    use HasUuids;

    protected $fillable = [
        'type', 'direction', 'establishment_id', 'user_id', 'learner_id',
        'student_name', 'student_info', 'student_matricule',
        'payer_name', 'payer_phone', 'payer_relation',
        'counterparty_name', 'counterparty_phone', 'label',
        'fee_type', 'channel', 'amount', 'service_fee', 'commission', 'total',
        'currency', 'status', 'reference', 'idempotency_key', 'confirmed_at', 'settlement_id',
        'gateway', 'payment_token', 'notify_token', 'gateway_ref',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'service_fee' => 'decimal:2',
            'commission' => 'decimal:2',
            'total' => 'decimal:2',
            'confirmed_at' => 'datetime',
        ];
    }

    public function establishment(): BelongsTo
    {
        return $this->belongsTo(Establishment::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function receipt(): HasOne
    {
        return $this->hasOne(Receipt::class);
    }

    public function settlement(): BelongsTo
    {
        return $this->belongsTo(Settlement::class);
    }
}
