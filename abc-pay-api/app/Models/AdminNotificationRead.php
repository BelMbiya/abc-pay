<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Marqueur « lu » individuel d'un admin sur une notification du fil partagé. */
class AdminNotificationRead extends Model
{
    public $timestamps = false;

    protected $fillable = ['admin_id', 'admin_notification_id', 'read_at'];

    protected function casts(): array
    {
        return ['read_at' => 'datetime'];
    }
}
