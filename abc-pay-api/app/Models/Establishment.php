<?php

namespace App\Models;

use Database\Factories\EstablishmentFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Establishment extends Model
{
    /** @use HasFactory<EstablishmentFactory> */
    use HasFactory, HasUuids;

    protected $fillable = [
        'name', 'merchant_code', 'type', 'level', 'city',
        'commission_rate', 'currency', 'billing_mode', 'fees', 'presets', 'is_active',
    ];

    public function managesFees(): bool
    {
        return $this->billing_mode === 'fee_management';
    }

    protected function casts(): array
    {
        return [
            'fees' => 'array',
            'presets' => 'array',
            'commission_rate' => 'decimal:4',
            'is_active' => 'boolean',
        ];
    }

    public function transactions(): HasMany
    {
        return $this->hasMany(Transaction::class);
    }

    public function feeTypes(): HasMany
    {
        return $this->hasMany(FeeType::class);
    }

    public function learners(): HasMany
    {
        return $this->hasMany(Learner::class);
    }

    public function feeSchedules(): HasMany
    {
        return $this->hasMany(FeeSchedule::class);
    }

    public function staff(): HasMany
    {
        return $this->hasMany(EstablishmentStaff::class);
    }
}
