<?php

namespace App\Services\Payment\Gateways\Contracts;

/**
 * Résultat NEUTRE de l'initialisation d'un encaissement.
 *
 *  - `reference`      : clé à stocker en `gateway_ref` pour interroger le statut ensuite.
 *  - `redirectUrl`    : page hébergée à ouvrir (CinetPay). NULL = paiement poussé
 *                       directement sur le téléphone (Araka) → le front va au *polling*.
 *  - `paymentToken`   / `notifyToken` : métadonnées optionnelles de la passerelle.
 *  - `providerRef`    : identifiant propre à la passerelle (ex. Araka `transactionId`).
 */
final readonly class PaymentInit
{
    public function __construct(
        public string $reference,
        public ?string $redirectUrl = null,
        public ?string $paymentToken = null,
        public ?string $notifyToken = null,
        public ?string $providerRef = null,
    ) {}

    /** Vrai si le payeur doit être redirigé vers une page hébergée (vs push direct). */
    public function requiresRedirect(): bool
    {
        return $this->redirectUrl !== null && $this->redirectUrl !== '';
    }
}
