<?php

namespace App\Services\Identity\Exceptions;

use RuntimeException;

/** Action de gestion de compte refusée (ex. suppression d'un compte avec historique). */
class UserActionException extends RuntimeException {}
