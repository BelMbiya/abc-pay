<?php

namespace App\Services\Payment\Exceptions;

use RuntimeException;

/** Tentative de reversement alors qu'aucun encaissement n'est en attente. */
class NothingToSettleException extends RuntimeException {}
