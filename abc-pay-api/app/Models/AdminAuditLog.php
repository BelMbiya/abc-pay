<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Entrée du journal d'audit admin (append-only : pas d'updated_at, on ne modifie jamais).
 */
class AdminAuditLog extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'admin_id', 'admin_name', 'admin_role', 'action', 'method', 'path',
        'target_type', 'target_id', 'meta', 'ip', 'status', 'created_at',
    ];

    protected function casts(): array
    {
        return ['meta' => 'array', 'created_at' => 'datetime'];
    }
}
