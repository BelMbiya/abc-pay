<?php

namespace App\Services\Identity;

use App\Services\Identity\Contracts\PhoneTokenVerifier;
use App\Services\Identity\Exceptions\InvalidPhoneTokenException;

/**
 * Vérificateur de test/dev (aucun appel réseau). Un jeton de la forme
 * "fake:+243XXXXXXXXX" est accepté et renvoie le numéro. Utilisé quand Firebase
 * n'est pas configuré (CI, dev local).
 */
class FakePhoneTokenVerifier implements PhoneTokenVerifier
{
    public function verify(string $idToken): string
    {
        if (str_starts_with($idToken, 'fake:')) {
            $phone = substr($idToken, 5);
            if (preg_match('/^\+\d{8,15}$/', $phone) === 1) {
                return $phone;
            }
        }

        throw new InvalidPhoneTokenException('Jeton de test invalide.');
    }
}
