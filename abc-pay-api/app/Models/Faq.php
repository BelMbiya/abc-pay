<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/** Entrée de FAQ gérée en admin (publiée → visible landing + page /faq). */
class Faq extends Model
{
    use HasUuids;

    protected $fillable = ['category', 'question', 'answer', 'position', 'is_published'];

    protected function casts(): array
    {
        return ['is_published' => 'boolean', 'position' => 'integer'];
    }
}
