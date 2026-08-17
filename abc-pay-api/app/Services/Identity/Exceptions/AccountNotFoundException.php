<?php

namespace App\Services\Identity\Exceptions;

use RuntimeException;

/** Connexion demandée pour un numéro sans compte existant. */
class AccountNotFoundException extends RuntimeException {}
