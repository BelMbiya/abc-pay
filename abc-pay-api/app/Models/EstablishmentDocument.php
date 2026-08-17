<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Pièce KYB d'un établissement/marchand (RDC) + son statut de revue. */
class EstablishmentDocument extends Model
{
    use HasUuids;

    protected $fillable = [
        'establishment_id', 'type', 'number', 'file_path', 'status', 'note', 'reviewed_by', 'reviewed_at',
    ];

    protected function casts(): array
    {
        return ['reviewed_at' => 'datetime'];
    }

    public function establishment(): BelongsTo
    {
        return $this->belongsTo(Establishment::class);
    }
}
