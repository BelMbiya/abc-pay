<?php

namespace App\Services\Payment\Gateways;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client HTTP CinetPay — API « Aurore ». Auth UNIFIÉE : api_key + api_password →
 * access_token (Bearer), utilisé pour l'encaissement (/payment) ET le reversement
 * (/transfer). Aucune logique métier ici. Fakeable via Http::fake().
 */
class CinetPayClient
{
    public function enabled(): bool
    {
        return (bool) config('cinetpay.enabled');
    }

    /** Option de vérification TLS : bundle CA embarqué si présent, sinon booléen système. */
    private function verify(): bool|string
    {
        $bundle = config('cinetpay.ca_bundle');
        if ($bundle && is_file($bundle)) {
            return $bundle;
        }

        return (bool) config('cinetpay.verify_ssl', true);
    }

    /** Requête HTTP de base (JSON + vérification TLS configurée). */
    private function http(): PendingRequest
    {
        return Http::withOptions(['verify' => $this->verify()])->acceptJson();
    }

    /** Jeton d'accès (Bearer), mis en cache (expires_in = 86400 s). */
    public function token(): string
    {
        return Cache::remember('cinetpay.token', config('cinetpay.token_ttl'), function () {
            $res = $this->http()
                ->post(config('cinetpay.base_url').'/oauth/login', [
                    'api_key' => config('cinetpay.api_key'),
                    'api_password' => config('cinetpay.api_password'),
                ])
                ->throw()
                ->json();

            $token = $res['access_token'] ?? null;
            if (! $token) {
                throw new RuntimeException('CinetPay auth échec: '.($res['message'] ?? ($res['status'] ?? 'inconnu')));
            }

            return $token;
        });
    }

    /** Requête authentifiée (Bearer). */
    private function auth(): PendingRequest
    {
        return $this->http()->withToken($this->token());
    }

    /**
     * Initialise un paiement web → renvoie `payment_url`, `payment_token`,
     * `transaction_id`, `notify_token`, et `details.must_be_redirected` (paiement direct).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function initPayment(array $payload): array
    {
        return $this->auth()->post(config('cinetpay.base_url').'/payment', $payload)->throw()->json();
    }

    /**
     * Statut AUTORITAIRE d'un paiement : GET /v1/payment/{merchant_transaction_id}.
     * Réponse : { code, status: SUCCESS|FAILED|PENDING|INITIATED, ... }.
     *
     * @return array<string, mixed>
     */
    public function checkPayment(string $merchantTransactionId): array
    {
        return $this->auth()->get(config('cinetpay.base_url').'/payment/'.$merchantTransactionId)->throw()->json();
    }

    /**
     * Envoie un reversement vers un numéro.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>  code 2002 = PENDING, + transaction_id + notify_token
     */
    public function sendTransfer(array $payload): array
    {
        return $this->auth()->post(config('cinetpay.base_url').'/transfer', $payload)->throw()->json();
    }

    /** Statut d'un reversement. */
    public function checkTransfer(string $merchantTransactionId): array
    {
        return $this->auth()->get(config('cinetpay.base_url').'/transfer', ['merchant_transaction_id' => $merchantTransactionId])->throw()->json();
    }
}
