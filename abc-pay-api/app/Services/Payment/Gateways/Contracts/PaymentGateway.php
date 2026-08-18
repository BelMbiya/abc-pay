<?php

namespace App\Services\Payment\Gateways\Contracts;

use App\Services\Payment\Gateways\Exceptions\GatewayException;

/**
 * Contrat NEUTRE d'une passerelle d'ENCAISSEMENT (pattern Strategy). Découple la logique
 * métier (TuitionPaymentService, TransferService) de toute passerelle concrète : on
 * dépend de cette abstraction (DIP), et l'implémentation est choisie par configuration
 * (`payment.default_gateway`) via le conteneur de services.
 *
 * NB : le REVERSEMENT (payout) n'est PAS dans ce contrat — il reste porté par CinetPay
 * (SettlementService), Araka étant collecte-seule.
 */
interface PaymentGateway
{
    /** Identifiant court de la passerelle (stocké en `gateway` sur la transaction). */
    public function name(): string;

    /** La passerelle est-elle active ? (OFF → mode démo, confirmation mock immédiate.) */
    public function enabled(): bool;

    /**
     * Initialise un encaissement. Renvoie un PaymentInit neutre.
     *
     * @throws GatewayException  si la passerelle refuse (message déjà lisible pour le payeur)
     */
    public function initPayment(PaymentRequest $request): PaymentInit;

    /** Statut AUTORITAIRE d'un encaissement, par sa référence marchande (`gateway_ref`). */
    public function checkPayment(string $reference): PaymentState;
}
