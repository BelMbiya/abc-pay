<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Learner extends Model
{
    /** @use HasFactory<\Database\Factories\LearnerFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'establishment_id', 'abcpay_ref', 'last_name', 'middle_name', 'first_name',
        'academic_group', 'matricule', 'parent_name', 'parent_phone', 'parent_relation',
        'status', 'source', 'balance',
    ];

    protected function casts(): array
    {
        return ['balance' => 'decimal:2'];
    }

    public function establishment(): BelongsTo
    {
        return $this->belongsTo(Establishment::class);
    }

    public function feeItems(): HasMany
    {
        return $this->hasMany(FeeItem::class);
    }
}
