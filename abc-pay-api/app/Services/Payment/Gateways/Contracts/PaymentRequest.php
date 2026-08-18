<?php

namespace App\Services\Payment\Gateways\Contracts;

/**
 * Demande d'encaissement NEUTRE (entrée d'une passerelle). Ne contient que des données
 * métier abc pay ; chaque passerelle mappe ensuite vers son propre format (CinetPay
 * `payment_method`, Araka `paymentPageId`/`provider`…). Le `channel` est le canal abc pay
 * (mpesa/airtel/orange/africell/visa) — la passerelle le traduit en code opérateur.
 */
final readonly class PaymentRequest
{
    public function __construct(
        public string $merchantRef,        // référence marchande (≤20, stockée en gateway_ref)
        public int $amount,                // montant entier (unité de la devise)
        public string $currency,           // USD | CDF
        public string $channel,            // canal abc pay
        public string $designation,        // libellé (min 2 car.)
        public string $clientEmail,
        public string $clientFirstName,
        public string $clientLastName,
        public ?string $clientPhone,
        public string $successUrl,
        public string $failedUrl,
        public string $notifyUrl,
    ) {}
}
