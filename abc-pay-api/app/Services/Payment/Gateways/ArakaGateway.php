<?php

namespace App\Services\Payment\Gateways;

use App\Services\Payment\Gateways\Contracts\PaymentGateway;
use App\Services\Payment\Gateways\Contracts\PaymentInit;
use App\Services\Payment\Gateways\Contracts\PaymentRequest;
use App\Services\Payment\Gateways\Contracts\PaymentState;
use App\Services\Payment\Gateways\Exceptions\GatewayException;
use Illuminate\Http\Client\RequestException;

/**
 * Passerelle Araka Payments derrière le contrat neutre PaymentGateway (adaptateur).
 *
 * Spécificité : l'encaissement est un PUSH DIRECT sur le téléphone (provider + walletID) —
 * la réponse ne contient AUCUNE URL de page. `initPayment` renvoie donc `redirectUrl = null`
 * (le front va directement au *polling* du statut). Le statut réel (APPROVED/DECLINED) est
 * ensuite lu via le statut « par référence » (ou poussé par le callback signé HMAC).
 */
class ArakaGateway implements PaymentGateway
{
    public function __construct(private readonly ArakaClient $client) {}

    public function name(): string
    {
        return 'araka';
    }

    public function enabled(): bool
    {
        return $this->client->enabled();
    }

    public function initPayment(PaymentRequest $r): PaymentInit
    {
        $map = (array) config('araka.provider_map', []);
        $provider = $map[$r->channel] ?? strtoupper($r->channel);
        $isCard = $provider === 'CARD';

        // Push DIRECT : le paiement est envoyé sur le téléphone (walletID). Sans numéro,
        // Araka n'a aucune cible → on exige le numéro AVANT l'appel (message clair).
        if (! $isCard && ! $r->clientPhone) {
            throw new GatewayException('Un numéro de téléphone (mobile money) est requis pour le paiement direct.');
        }

        $payload = [
            'order' => array_filter([
                'paymentPageId' => config('araka.payment_page_id'),
                'customerFullName' => trim($r->clientFirstName.' '.$r->clientLastName),
                'customerPhoneNumber' => $r->clientPhone,
                'customerEmailAddress' => $r->clientEmail,
                'transactionReference' => $r->merchantRef,
                'amount' => $r->amount,
                'currency' => $r->currency,          // USD | CDF
                'redirectURL' => $r->notifyUrl,      // callback résultat (POST)
            ], fn ($v) => $v !== null && $v !== ''),
            'paymentChannel' => array_filter([
                'channel' => $isCard ? 'CARD' : 'MOBILEMONEY',
                'provider' => $isCard ? null : $provider,
                'walletID' => $r->clientPhone,
            ], fn ($v) => $v !== null && $v !== ''),
        ];

        try {
            $res = $this->client->paymentRequest($payload);
        } catch (RequestException $e) {
            $body = (array) ($e->response?->json() ?? []);
            $reason = $body['statusDescription'] ?? $body['message'] ?? 'passerelle indisponible, réessaie plus tard.';
            throw new GatewayException('Paiement refusé par Araka : '.$reason);
        }

        // 202 ACCEPTED (push envoyé) ou 200 APPROVED = accepté ; sinon refus (DECLINED…).
        $code = (string) ($res['statusCode'] ?? '');
        if (! in_array($code, ['202', '200'], true)) {
            throw new GatewayException('Araka : '.($res['statusDescription'] ?? 'paiement refusé'));
        }

        $providerRef = $res['transactionId'] ?? null;

        return new PaymentInit(
            reference: $r->merchantRef,   // statut interrogé « par référence »
            redirectUrl: null,            // push direct : pas de page hébergée
            paymentToken: $providerRef,   // on garde l'id Araka (retrouvé par le callback)
            notifyToken: null,
            providerRef: $providerRef,
        );
    }

    public function checkPayment(string $reference): PaymentState
    {
        $res = $this->client->statusByReference($reference);
        // L'API UAT renvoie un TABLEAU [ {...} ] (une transaction par référence) ; on
        // déballe la première ligne. (Certaines versions renvoient l'objet seul.)
        if (isset($res[0]) && is_array($res[0])) {
            $res = $res[0];
        }
        $desc = strtoupper((string) ($res['status'] ?? $res['statusDescription'] ?? ''));

        return match (true) {
            in_array($desc, ['APPROVED', 'SUCCESS', 'COMPLETED'], true) => PaymentState::Success,
            in_array($desc, ['DECLINED', 'FAILED', 'REJECTED'], true) => PaymentState::Failed,
            default => PaymentState::Pending,
        };
    }
}
