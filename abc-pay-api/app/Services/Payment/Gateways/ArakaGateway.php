<?php

namespace App\Services\Payment\Gateways;

use App\Services\Payment\Gateways\Contracts\PaymentGateway;
use App\Services\Payment\Gateways\Contracts\PaymentInit;
use App\Services\Payment\Gateways\Contracts\PaymentRequest;
use App\Services\Payment\Gateways\Contracts\PaymentState;
use App\Services\Payment\Gateways\Contracts\TransferRequest;
use App\Services\Payment\Gateways\Contracts\TransferResult;
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

    public function payoutEnabled(): bool
    {
        // Endpoint `sendmobilemoney` : activation SÉPARÉE par l'équipe technique Araka.
        // OFF → reversement = acte comptable (marqué « payé »).
        return $this->client->enabled() && (bool) config('araka.transfer_enabled');
    }

    public function sendTransfer(TransferRequest $r): TransferResult
    {
        // Décaissement direct : sans numéro (walletID), Araka n'a aucune cible.
        if (! $r->phone) {
            throw new GatewayException('Un numéro mobile money (bénéficiaire) est requis pour le reversement Araka.');
        }

        // `transactionReference` Araka ≤ 20 : l'id du Settlement (UUID, 36) est trop long →
        // référence courte déterministe (hex de l'UUID tronqué). Le décaissement étant
        // synchrone, cette référence n'a pas à être matchée par un webhook.
        $wireRef = 'S'.substr(preg_replace('/[^A-Za-z0-9]/', '', $r->reference), 0, 19);

        $payload = [
            'order' => array_filter([
                'customerFullName' => $r->beneficiaryName,
                'customerPhoneNumber' => $r->phone,
                'customerEmailAddress' => $r->email,
                'transactionReference' => $wireRef,
                'amount' => round($r->amount, 2),
                'currency' => $r->currency,          // USD | CDF
            ], fn ($v) => $v !== null && $v !== ''),
            'destination' => [
                'provider' => $this->payoutProvider($r->channel),   // MPESA | AIRTEL | ORANGE | AFRIMONEY
                'walletID' => $r->phone,                            // MSISDN +243…
            ],
        ];

        try {
            $res = $this->client->sendMobileMoney($payload);
        } catch (RequestException $e) {
            $body = (array) ($e->response?->json() ?? []);
            $reason = $body['statusDescription'] ?? $body['message'] ?? 'passerelle indisponible, réessaie plus tard.';
            throw new GatewayException('Reversement refusé par Araka : '.$reason);
        }

        // 200 SUCCESS = décaissé ; 202 ACCEPTED/PENDING = accepté (en cours) ; sinon refus.
        $code = (string) ($res['statusCode'] ?? '');
        $desc = strtoupper((string) ($res['statusDescription'] ?? ''));
        $accepted = in_array($code, ['200', '202'], true)
            || in_array($desc, ['SUCCESS', 'APPROVED', 'ACCEPTED', 'PENDING'], true);
        if (! $accepted) {
            throw new GatewayException('Reversement refusé par Araka : '.($res['statusDescription'] ?? 'refusé'));
        }

        $done = $code === '200' || in_array($desc, ['SUCCESS', 'APPROVED', 'COMPLETED'], true);

        return new TransferResult(
            state: $done ? PaymentState::Success : PaymentState::Pending,
            providerRef: $res['transactionId'] ?? null,
            notifyToken: null,
        );
    }

    /**
     * Opérateur de réception Araka (MPESA/AIRTEL/ORANGE/AFRIMONEY) à partir du
     * payout_method de l'établissement. Accepte le canal abc pay (mpesa) COMME un code
     * CinetPay hérité (MPESA_CD, OM_CD, FLOOZ…) — normalisation tolérante.
     */
    private function payoutProvider(?string $channel): string
    {
        $c = strtolower(trim((string) $channel));
        $c = (string) preg_replace('/[_-]?cd$/', '', $c); // MPESA_CD → mpesa, om_cd → om

        return match ($c) {
            'mpesa', 'vodacom', 'mpesacd' => 'MPESA',
            'airtel', 'airtelcd', 'airtelmoney' => 'AIRTEL',
            'orange', 'om', 'orangemoney' => 'ORANGE',
            'africell', 'afrimoney', 'flooz' => 'AFRIMONEY',
            default => strtoupper($c !== '' ? $c : 'MPESA'),
        };
    }
}
