<?php

namespace App\Services\Payment\Gateways\Exceptions;

use RuntimeException;

/**
 * Échec RENVOYÉ par une passerelle de paiement (refus, paramètres invalides, IP non
 * autorisée, devise non permise…). Porte un message DÉJÀ lisible pour le payeur (préfixé
 * du nom de la passerelle). Les services métier l'attrapent et le convertissent en
 * ValidationException (422) — jamais un 500 opaque, jamais un faux « réussi ».
 */
class GatewayException extends RuntimeException {}
