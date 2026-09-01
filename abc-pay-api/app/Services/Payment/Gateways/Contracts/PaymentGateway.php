<?php

namespace App\Services\Payment\Gateways\Contracts;

use App\Services\Payment\Gateways\Exceptions\GatewayException;

/**
 * Contrat NEUTRE d'une passerelle de paiement (pattern Strategy). Découple la logique
 * métier (TuitionPaymentService, TransferService, SettlementService) de toute passerelle
 * concrète : on dépend de cette abstraction (DIP), et l'implémentation est choisie par
 * configuration (`payment.default_gateway`) via le conteneur de services.
 *
 * Couvre l'ENCAISSEMENT (initPayment/checkPayment) ET le REVERSEMENT/décaissement
 * (payoutEnabled/sendTransfer). CinetPay (`/transfer`) comme Araka (`/pay/sendmobilemoney`)
 * savent décaisser : le reversement suit donc la passerelle active, sans code spécifique.
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

    /**
     * Le décaissement RÉEL est-il actif ? (passerelle active + module de transfert activé
     * sur le compte). OFF → le reversement est un simple acte comptable (marqué « payé »).
     */
    public function payoutEnabled(): bool;

    /**
     * Décaisse un reversement vers un mobile money. Renvoie un TransferResult neutre
     * (Success = confirmé, Pending = accepté/confirmation par webhook).
     *
     * @throws GatewayException  si la passerelle refuse (message déjà lisible)
     */
    public function sendTransfer(TransferRequest $request): TransferResult;
}
