<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FeeItem extends Model
{
    use HasUuids;

    protected $fillable = ['establishment_id', 'learner_id', 'fee_type_id', 'label', 'amount_due', 'amount_paid', 'currency'];

    protected function casts(): array
    {
        return ['amount_due' => 'decimal:2', 'amount_paid' => 'decimal:2'];
    }

    public function learner(): BelongsTo
    {
        return $this->belongsTo(Learner::class);
    }
}
