<?php

namespace App\Services\Identity;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
use App\Services\Identity\Exceptions\AccountBlockedException;
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

        // Identifiants BONS mais compte bloqué (litige) → message clair.
        if ($user->is_blocked) {
            throw new AccountBlockedException('Compte bloqué suite à un litige avec la plateforme. Contacte le support abc pay.');
        }

        $staff = EstablishmentStaff::where('user_id', $user->id)->first();
        if (! $staff) {
            throw new InvalidCredentialsException('Ce compte n\'a pas d\'accès établissement.');
        }

        // SÉCURITÉ : un établissement suspendu ne peut plus se connecter.
        $establishment = Establishment::find($staff->establishment_id);
        if (! $establishment || ! $establishment->is_active) {
            throw new AccountBlockedException('Cet établissement est suspendu. Contacte le support abc pay.');
        }

        return [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $staff->role,
                'establishment_id' => $staff->establishment_id,
                'establishment_name' => $establishment->name,
                // Gate KYC : le front affiche le mur de vérification si requis et non approuvé.
                'kyc_required' => (bool) $staff->kyc_required,
                'kyc_status' => $user->kyc_status ?? 'none',
                // Gate mot de passe : changement obligatoire à la 1re connexion / après reset admin.
                'must_change_password' => (bool) $user->must_change_password,
            ],
            'token_type' => 'Bearer',
            'access_token' => $this->jwt->issueStaffAccess($user, $staff->establishment_id, $staff->role),
            'refresh_token' => $this->jwt->issueStaffRefresh($user, $staff->establishment_id, $staff->role),
            'expires_in' => (int) config('jwt.access_ttl'),
        ];
    }
}
