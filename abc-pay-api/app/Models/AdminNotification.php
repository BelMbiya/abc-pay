<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

/**
 * Notification opérationnelle du fil super-admin (fraude / support / système).
 * Fil partagé par l'équipe admin — voir la migration pour le choix de conception.
 */
class AdminNotification extends Model
{
    use HasUuids;

    protected $table = 'admin_notifications';

    protected $fillable = ['type', 'level', 'title', 'body', 'meta', 'read_at'];

    protected function casts(): array
    {
        return ['meta' => 'array', 'read_at' => 'datetime'];
    }
}
