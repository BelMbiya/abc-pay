<?php

namespace App\Services\Identity;

use App\Models\Admin;
use App\Models\EstablishmentStaff;
use App\Models\User;
use App\Services\Identity\Exceptions\InvalidRefreshTokenException;
use Throwable;

/**
 * Use case : renouvellement d'un jeton d'accès à partir d'un refresh token.
 * Le refresh porte le scope (payer / staff / admin) ; on réémet un accès scopé
 * ET on fait tourner le refresh (rotation). Le sujet est revalidé en base.
 */
class RefreshService
{
    public function __construct(private readonly JwtService $jwt) {}

    /**
     * @return array<string, mixed>
     *
     * @throws InvalidRefreshTokenException
     */
    public function refresh(string $refreshToken): array
    {
        try {
            $claims = $this->jwt->parse($refreshToken);
        } catch (Throwable $e) {
            throw new InvalidRefreshTokenException('Refresh token invalide ou expiré.', 0, $e);
        }

        if (($claims['type'] ?? null) !== 'refresh') {
            throw new InvalidRefreshTokenException('Type de jeton invalide.');
        }

        return match ($claims['scope'] ?? null) {
            'payer' => $this->payer($claims),
            'staff' => $this->staff($claims),
            'admin' => $this->admin($claims),
            default => throw new InvalidRefreshTokenException('Scope inconnu.'),
        };
    }

    /** @param array<string, mixed> $claims */
    private function payer(array $claims): array
    {
        $user = User::find($claims['sub'] ?? null);
        if (! $user) {
            throw new InvalidRefreshTokenException('Utilisateur introuvable.');
        }
        if ($user->is_blocked) {
            throw new InvalidRefreshTokenException('Compte bloqué.');
        }
        $revokedAt = $user->sessions_revoked_at?->timestamp;
        if ($revokedAt && (int) ($claims['iat'] ?? 0) < $revokedAt) {
            throw new InvalidRefreshTokenException('Session révoquée.');
        }

        return $this->payload('payer', $this->jwt->issueAccess($user), $this->jwt->issueRefresh($user));
    }

    /** @param array<string, mixed> $claims */
    private function staff(array $claims): array
    {
        $user = User::find($claims['sub'] ?? null);
        $establishmentId = $claims['establishment_id'] ?? null;
        if ($user && $user->is_blocked) {
            throw new InvalidRefreshTokenException('Compte bloqué.');
        }

        $staff = ($user && $establishmentId)
            ? EstablishmentStaff::where('user_id', $user->id)->where('establishment_id', $establishmentId)->first()
            : null;
        if (! $staff) {
            throw new InvalidRefreshTokenException('Accès établissement révoqué.');
        }
        // SÉCURITÉ : établissement suspendu → plus de renouvellement de session.
        $establishment = \App\Models\Establishment::find($establishmentId);
        if (! $establishment || ! $establishment->is_active) {
            throw new InvalidRefreshTokenException('Établissement suspendu.');
        }
        // SÉCURITÉ : rôle RE-LU en base (jamais repris du jeton) → un downgrade de rôle
        // prend effet immédiatement au prochain refresh (pas de persistance de privilège).
        $role = $staff->role;

        return $this->payload(
            'staff',
            $this->jwt->issueStaffAccess($user, $establishmentId, $role),
            $this->jwt->issueStaffRefresh($user, $establishmentId, $role),
        );
    }

    /** @param array<string, mixed> $claims */
    private function admin(array $claims): array
    {
        $admin = Admin::find($claims['sub'] ?? null);
        if (! $admin || ! $admin->is_active) {
            throw new InvalidRefreshTokenException('Administrateur introuvable ou désactivé.');
        }

        return $this->payload('admin', $this->jwt->issueAdminAccess($admin), $this->jwt->issueAdminRefresh($admin));
    }

    private function payload(string $scope, string $access, string $refresh): array
    {
        return [
            'scope' => $scope,
            'token_type' => 'Bearer',
            'access_token' => $access,
            'refresh_token' => $refresh,
            'expires_in' => (int) config('jwt.access_ttl'),
        ];
    }
}
