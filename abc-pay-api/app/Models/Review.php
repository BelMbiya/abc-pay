<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasUuids;

    protected $fillable = [
        'author_type', 'author_id', 'author_name', 'author_role',
        'context', 'rating', 'message', 'status', 'moderated_by',
    ];

    protected function casts(): array
    {
        return ['rating' => 'integer'];
    }
}
