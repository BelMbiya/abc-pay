<?php

namespace App\Models;

use App\Services\Identity\AdminRbac;
use Illuminate\Database\Eloquent\Model;

/**
 * Administrateur plateforme (compte système). Authentifié par email + mot de passe
 * (scope=admin dans le JWT). Rôle + permissions gérés par {@see AdminRbac}.
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
            'must_change_password' => 'boolean',
        ];
    }

    /** Permissions effectives (selon le rôle). @return list<string> */
    public function permissions(): array
    {
        return AdminRbac::permissionsFor($this->role);
    }

    /** Cet admin a-t-il la permission ? */
    public function hasPermission(string $permission): bool
    {
        return AdminRbac::can($this->role, $permission);
    }
}
