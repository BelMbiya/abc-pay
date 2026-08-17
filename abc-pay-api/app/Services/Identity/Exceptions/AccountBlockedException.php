<?php

namespace App\Services\Identity\Exceptions;

use RuntimeException;

/** Connexion/inscription refusée : le compte est bloqué. */
class AccountBlockedException extends RuntimeException {}
