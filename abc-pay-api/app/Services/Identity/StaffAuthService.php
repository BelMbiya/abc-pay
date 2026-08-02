<?php

namespace App\Services\Identity;

use App\Models\EstablishmentStaff;
use App\Models\User;
use App\Services\Identity\Exceptions\InvalidCredentialsException;
use Illuminate\Support\Facades\Hash;

/**
 * Use case : connexion du personnel d'établissement (email + mot de passe).
 * Vérifie les identifiants, retrouve le rôle/établissement, émet un JWT staff.
 * Logique hors contrôleur (DDD).
 */
class StaffAuthService
{
    public function __construct(private readonly JwtService $jwt) {}

    /**
     * @return array<string, mixed>
     *
     * @throws InvalidCredentialsException
     */
    public function login(string $email, string $password): array
    {
        $user = User::where('email', $email)->first();

        if (! $user || ! $user->password || ! Hash::check($password, $user->password)) {
            throw new InvalidCredentialsException('Identifiants invalides.');
        }

        $staff = EstablishmentStaff::where('user_id', $user->id)->first();
        if (! $staff) {
            throw new InvalidCredentialsException('Ce compte n\'a pas d\'accès établissement.');
        }

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $staff->role,
                'establishment_id' => $staff->establishment_id,
            ],
            'token_type' => 'Bearer',
            'access_token' => $this->jwt->issueStaffAccess($user, $staff->establishment_id, $staff->role),
            'refresh_token' => $this->jwt->issueStaffRefresh($user, $staff->establishment_id, $staff->role),
            'expires_in' => (int) config('jwt.access_ttl'),
        ];
    }
}
