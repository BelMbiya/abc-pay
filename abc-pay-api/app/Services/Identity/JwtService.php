<?php

namespace App\Services\Identity;

use App\Models\Admin;
use App\Models\User;
use Firebase\JWT\ExpiredException;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Firebase\JWT\SignatureInvalidException;

/**
 * Émission et vérification des JWT applicatifs (RS256).
 * Les clés sont lues depuis la config à l'exécution (surchargeables en test).
 */
class JwtService
{
    public function issueAccess(User $user): string
    {
        return $this->encode($user->id, 'access', (int) config('jwt.access_ttl'), ['scope' => 'payer', 'phone' => $user->phone]);
    }

    public function issueRefresh(User $user): string
    {
        return $this->encode($user->id, 'refresh', (int) config('jwt.refresh_ttl'), ['scope' => 'payer']);
    }

    /** Refresh staff : porte l'établissement + le rôle pour réémettre l'accès scopé. */
    public function issueStaffRefresh(User $user, string $establishmentId, string $role): string
    {
        return $this->encode($user->id, 'refresh', (int) config('jwt.refresh_ttl'), [
            'scope' => 'staff',
            'establishment_id' => $establishmentId,
            'role' => $role,
        ]);
    }

    /** Refresh super-admin. */
    public function issueAdminRefresh(Admin $admin): string
    {
        return $this->encode($admin->id, 'refresh', (int) config('jwt.refresh_ttl'), [
            'scope' => 'admin',
            'role' => $admin->role,
        ]);
    }

    /** Jeton d'accès du personnel d'établissement (porte l'établissement + le rôle). */
    public function issueStaffAccess(User $user, string $establishmentId, string $role): string
    {
        return $this->encode($user->id, 'access', (int) config('jwt.access_ttl'), [
            'scope' => 'staff',
            'establishment_id' => $establishmentId,
            'role' => $role,
        ]);
    }

    /** Jeton d'accès super-admin abc pay (scope=admin). */
    public function issueAdminAccess(Admin $admin): string
    {
        return $this->encode($admin->id, 'access', (int) config('jwt.access_ttl'), [
            'scope' => 'admin',
            'role' => $admin->role,
        ]);
    }

    /**
     * @return array<string, mixed>
     *
     * @throws ExpiredException|SignatureInvalidException|\UnexpectedValueException
     */
    public function parse(string $token): array
    {
        $claims = (array) JWT::decode($token, new Key((string) config('jwt.public_key'), (string) config('jwt.algo')));

        // Défense en profondeur : n'accepter que les jetons émis par NOUS (issuer attendu).
        if (($claims['iss'] ?? null) !== config('jwt.issuer')) {
            throw new \UnexpectedValueException('Émetteur de jeton invalide.');
        }

        return $claims;
    }

    /** @param  array<string, mixed>  $claims */
    private function encode(int|string $subjectId, string $type, int $ttl, array $claims = []): string
    {
        $now = now()->timestamp;

        return JWT::encode(array_merge([
            'iss' => config('jwt.issuer'),
            'sub' => $subjectId,
            'type' => $type,
            'iat' => $now,
            'exp' => $now + $ttl,
        ], $claims), (string) config('jwt.private_key'), (string) config('jwt.algo'));
    }
}
