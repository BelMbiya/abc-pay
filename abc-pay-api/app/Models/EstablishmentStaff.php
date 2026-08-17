<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstablishmentStaff extends Model
{
    use HasUuids;

    protected $table = 'establishment_staff';

    protected $fillable = ['establishment_id', 'user_id', 'role', 'kyc_required'];

    protected function casts(): array
    {
        return ['kyc_required' => 'boolean'];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function establishment(): BelongsTo
    {
        return $this->belongsTo(Establishment::class);
    }
}
