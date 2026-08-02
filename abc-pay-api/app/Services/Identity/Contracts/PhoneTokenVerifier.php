<?php

namespace App\Services\Identity\Contracts;

use App\Services\Identity\Exceptions\InvalidPhoneTokenException;

/**
 * Vérifie un jeton d'authentification téléphone (émis par le fournisseur OTP,
 * Firebase) et renvoie le numéro E.164 vérifié. Abstraction → testable et
 * remplaçable (fake en dev/CI, Firebase en prod).
 */
interface PhoneTokenVerifier
{
    /**
     * @throws InvalidPhoneTokenException
     */
    public function verify(string $idToken): string;
}
