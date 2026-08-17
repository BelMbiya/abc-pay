<?php

namespace App\Services\Identity;

use App\Models\User;
use App\Services\Identity\Contracts\PhoneTokenVerifier;
use App\Services\Identity\Exceptions\AccountBlockedException;
use App\Services\Identity\Exceptions\AccountNotFoundException;
use App\Services\Identity\Exceptions\EmailAlreadyUsedException;
use App\Services\Identity\Exceptions\InvalidPhoneTokenException;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Use case : authentification par jeton téléphone (Firebase).
 * Vérifie le jeton, retrouve/crée l'utilisateur par numéro, émet les JWT.
 * Logique hors contrôleur (DDD).
 *
 * RÈGLE D'ACCÈS (option A) : le numéro seul ne suffit pas à « se connecter ».
 *  - intent=login   : le compte DOIT déjà exister → sinon refus (AccountNotFound).
 *  - intent=signup  : INSCRIPTION délibérée → le compte n'est créé qu'AVEC une identité
 *                     (nom, validé en amont). Plus de compte fantôme `{phone}` nu.
 *                     Numéro DÉJÀ inscrit → simple connexion (l'OTP prouve la possession) ;
 *                     on n'écrase JAMAIS l'identité existante (anti-usurpation).
 *  - un compte bloqué ne peut ni se connecter ni s'inscrire (AccountBlocked).
 */
class AuthService
{
    public function __construct(
        private readonly PhoneTokenVerifier $verifier,
        private readonly JwtService $jwt,
    ) {}

    /**
     * @param  'login'|'signup'  $intent
     * @param  array<string, mixed>  $profile  identité fournie à l'inscription (déjà validée)
     * @return array<string, mixed>
     *
     * @throws InvalidPhoneTokenException|AccountNotFoundException|AccountBlockedException
     */
    public function loginWithPhoneToken(string $idToken, string $intent = 'login', array $profile = []): array
    {
        $phone = $this->verifier->verify($idToken);

        $existing = User::where('phone', $phone)->first();

        // Un compte bloqué ne franchit jamais l'authentification.
        if ($existing && $existing->is_blocked) {
            throw new AccountBlockedException();
        }

        if ($existing !== null) {
            // Numéro déjà inscrit : on ouvre la session (login OU signup — l'OTP prouve
            // la possession). L'identité existante n'est jamais modifiée ici.
            $user = $existing;
        } elseif ($intent === 'signup') {
            // Inscription : création AVEC l'identité fournie ($profile contient au moins
            // le nom, exigé par FirebaseAuthRequest). Le `#[Fillable]` du modèle filtre
            // les champs autorisés (anti mass-assignment).
            //
            // Garde d'unicité de l'e-mail : `users.email` est UNIQUE. Sans ce contrôle,
            // un e-mail déjà pris provoquait une UniqueConstraintViolationException non
            // gérée → 500 « erreur interne » opaque. On lève une erreur métier claire
            // (mappée en 422 par le contrôleur), et on garde un filet anti-course.
            $email = $profile['email'] ?? null;
            if ($email !== null && $email !== '' && User::where('email', $email)->exists()) {
                throw new EmailAlreadyUsedException();
            }
            try {
                $user = User::create([...$profile, 'phone' => $phone]);
            } catch (UniqueConstraintViolationException $e) {
                // Course entre deux inscriptions simultanées sur le même e-mail/numéro.
                throw new EmailAlreadyUsedException();
            }
            if ($user->hasCompleteKyc()) {
                $user->profile_completed_at = now();
                $user->save();
            }
        } else {
            // Connexion sur un numéro sans compte : interdite (inscription requise).
            throw new AccountNotFoundException();
        }

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
