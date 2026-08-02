<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeSchedule extends Model
{
    use HasUuids;

    protected $fillable = ['establishment_id', 'fee_type_id', 'academic_group', 'amount', 'currency'];

    protected function casts(): array
    {
        return ['amount' => 'decimal:2'];
    }

    public function feeType(): BelongsTo
    {
        return $this->belongsTo(FeeType::class);
    }
}
