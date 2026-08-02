<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    use HasUuids;

    protected $table = 'user_notifications';

    protected $fillable = ['user_id', 'type', 'level', 'title', 'body', 'meta', 'read_at'];

    protected function casts(): array
    {
        return ['meta' => 'array', 'read_at' => 'datetime'];
    }
}
