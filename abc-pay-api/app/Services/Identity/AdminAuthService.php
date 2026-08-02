<?php

namespace App\Services\Identity;

use App\Models\Admin;
use App\Services\Identity\Exceptions\InvalidCredentialsException;
use Illuminate\Support\Facades\Hash;

/**
 * Use case : connexion super-admin abc pay (email + mot de passe) → JWT scope=admin.
 * Logique hors contrôleur (DDD).
 */
class AdminAuthService
{
    public function __construct(private readonly JwtService $jwt) {}

    /**
     * Met à jour le profil d'un admin (nom, email, mot de passe — partiel).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function updateProfile(Admin $admin, array $data): array
    {
        if (! empty($data['name'])) {
            $admin->name = $data['name'];
        }
        if (! empty($data['email'])) {
            $admin->email = $data['email'];
        }
        if (! empty($data['password'])) {
            $admin->password = $data['password']; // hashé par le cast
        }
        $admin->save();

        return ['id' => $admin->id, 'name' => $admin->name, 'email' => $admin->email, 'role' => $admin->role];
    }

    /**
     * @return array<string, mixed>
     *
     * @throws InvalidCredentialsException
     */
    public function login(string $email, string $password): array
    {
        $admin = Admin::where('email', $email)->first();

        if (! $admin || ! Hash::check($password, $admin->password)) {
            throw new InvalidCredentialsException('Identifiants invalides.');
        }
        if (! $admin->is_active) {
            throw new InvalidCredentialsException('Compte administrateur désactivé.');
        }

        return [
            'admin' => [
                'id' => $admin->id,
                'name' => $admin->name,
                'email' => $admin->email,
                'role' => $admin->role,
            ],
            'token_type' => 'Bearer',
            'access_token' => $this->jwt->issueAdminAccess($admin),
            'refresh_token' => $this->jwt->issueAdminRefresh($admin),
            'expires_in' => (int) config('jwt.access_ttl'),
        ];
    }
}
