<?php

namespace App\Services\Identity\Exceptions;

use RuntimeException;

/** Inscription avec un e-mail déjà rattaché à un autre compte. */
class EmailAlreadyUsedException extends RuntimeException {}
