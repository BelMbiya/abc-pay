<?php

namespace App\Services\Identity;

use App\Models\User;
use App\Services\Identity\Contracts\PhoneTokenVerifier;
use App\Services\Identity\Exceptions\InvalidPhoneTokenException;

/**
 * Use case : authentification par jeton téléphone (Firebase).
 * Vérifie le jeton, retrouve/crée l'utilisateur par numéro, émet les JWT.
 * Logique hors contrôleur (DDD).
 */
class AuthService
{
    public function __construct(
        private readonly PhoneTokenVerifier $verifier,
        private readonly JwtService $jwt,
    ) {}

    /**
     * @return array<string, mixed>
     *
     * @throws InvalidPhoneTokenException
     */
    public function loginWithPhoneToken(string $idToken): array
    {
        $phone = $this->verifier->verify($idToken);

        $user = User::firstOrCreate(['phone' => $phone]);

        return [
            'user' => [
                'id' => $user->id,
                'phone' => $user->phone,
                'name' => $user->name,
            ],
            'token_type' => 'Bearer',
            'access_token' => $this->jwt->issueAccess($user),
            'refresh_token' => $this->jwt->issueRefresh($user),
            'expires_in' => (int) config('jwt.access_ttl'),
        ];
    }
}
