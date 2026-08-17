<?php

namespace App\Services\Tenancy\Exceptions;

use RuntimeException;

/** Action d'administration d'établissement refusée (ex. suppression avec historique). */
class EstablishmentActionException extends RuntimeException {}
