<?php

namespace App\Services\Payment\Gateways\Contracts;

/**
 * Demande de REVERSEMENT (payout) NEUTRE — entrée d'une passerelle de décaissement.
 * Ne contient que des données métier abc pay ; chaque passerelle mappe ensuite vers son
 * format (CinetPay `payment_method` + `merchant_transaction_id`, Araka `provider`/`walletID`).
 *
 *  - `reference` : identifiant STABLE (id du Settlement). CinetPay l'utilise comme
 *    `merchant_transaction_id` (matché par son webhook de transfert). Araka en dérive une
 *    référence courte (≤20) — inutile côté matching car son décaissement est synchrone.
 *  - `channel`   : opérateur de réception (payout_method de l'établissement). Chaque
 *    passerelle le normalise (CinetPay : code tel quel ; Araka : MPESA/AIRTEL/ORANGE/AFRIMONEY).
 */
final readonly class TransferRequest
{
    public function __construct(
        public string $reference,
        public float $amount,
        public string $currency,          // USD | CDF
        public ?string $channel,          // payout_method (code opérateur / canal)
        public ?string $phone,            // payout_phone (mobile money du bénéficiaire)
        public string $beneficiaryName,   // nom de l'établissement bénéficiaire
        public ?string $email = null,
        public string $reason = 'Reversement abc pay',
    ) {}
}
