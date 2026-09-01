<?php

namespace App\Services\Payment\Gateways\Contracts;

/**
 * Résultat NEUTRE d'un REVERSEMENT (payout). Une passerelle renvoie ceci en cas
 * d'ACCEPTATION (synchrone = Success, asynchrone = Pending) ; en cas de refus, elle lève
 * une GatewayException au message déjà lisible.
 *
 *  - `state`       : Success = décaissement confirmé (marquer « payé ») ; Pending = accepté,
 *                    confirmation ultérieure (webhook de transfert).
 *  - `providerRef` : identifiant du transfert côté passerelle (stocké en `gateway_transfer_id`).
 *  - `notifyToken` : jeton de rappel signé (CinetPay) — vérifié par le webhook de transfert.
 */
final readonly class TransferResult
{
    public function __construct(
        public PaymentState $state,
        public ?string $providerRef = null,
        public ?string $notifyToken = null,
    ) {}

    /** Vrai si le décaissement est DÉJÀ confirmé (pas d'attente d'un webhook). */
    public function isDone(): bool
    {
        return $this->state === PaymentState::Success;
    }
}
