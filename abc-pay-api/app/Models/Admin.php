<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Super-admin abc pay. Authentifié par email + mot de passe (scope=admin dans le JWT).
 */
class Admin extends Model
{
    protected $fillable = ['name', 'email', 'password', 'role', 'is_active'];

    protected $hidden = ['password'];

    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }
}
