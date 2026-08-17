<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Lead extends Model
{
    use HasUuids;

    protected $fillable = [
        'establishment_name', 'contact_name', 'phone', 'email', 'contact_channel', 'profile', 'message', 'source', 'status',
    ];
}
