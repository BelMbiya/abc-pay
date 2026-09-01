<?php

namespace App\Services\Payment\Gateways;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client HTTP Araka Payments (bas niveau). Auth bearer (`/api/login`), encaissement
 * (`/api/pay/paymentrequest`) et statut (`/api/reporting/transactionstatusbyreference`).
 * Aucune logique métier ici (le mapping est dans ArakaGateway). Fakeable via Http::fake().
 */
class ArakaClient
{
    public function enabled(): bool
    {
        return (bool) config('araka.enabled');
    }

    /** Option de vérification TLS : bundle CA embarqué si présent, sinon booléen système. */
    private function verify(): bool|string
    {
        $bundle = config('araka.ca_bundle');
        if ($bundle && is_file($bundle)) {
            return $bundle;
        }

        return (bool) config('araka.verify_ssl', true);
    }

    private function http(): PendingRequest
    {
        return Http::withOptions(['verify' => $this->verify()])->acceptJson();
    }

    /** Jeton bearer (`/api/login`), mis en cache. */
    public function token(): string
    {
        return Cache::remember('araka.token', config('araka.token_ttl'), function () {
            $res = $this->http()
                ->post(config('araka.base_url').'/api/login', [
                    'emailAddress' => config('araka.email'),
                    'password' => config('araka.password'),
                ])
                ->throw()
                ->json();

            $token = $res['token'] ?? null;
            if (! $token) {
                throw new RuntimeException('Araka auth échec: '.($res['message'] ?? 'inconnu'));
            }

            return $token;
        });
    }

    private function auth(): PendingRequest
    {
        return $this->http()->withToken($this->token());
    }

    /**
     * Demande de paiement (push direct). En-tête X-API-CALLBACK-MODE optionnel (HMAC).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>  { transactionId, originatingTransactionId, statusCode, statusDescription }
     */
    public function paymentRequest(array $payload): array
    {
        $req = $this->auth();
        if ($mode = config('araka.callback_mode')) {
            $req = $req->withHeaders(['X-API-CALLBACK-MODE' => (string) $mode]);
        }

        return $req->post(config('araka.base_url').'/api/pay/paymentrequest', $payload)->throw()->json();
    }

    /**
     * REVERSEMENT (payout) : envoie de l'argent vers un wallet mobile money.
     * `/api/pay/sendmobilemoney` — décaissement direct (order + destination provider/walletID).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>  { transactionId, originatingTransactionId, statusCode, statusDescription }
     */
    public function sendMobileMoney(array $payload): array
    {
        return $this->auth()
            ->post(config('araka.base_url').'/api/pay/sendmobilemoney', $payload)
            ->throw()
            ->json();
    }

    /**
     * Statut d'une transaction par NOTRE référence (transactionReference).
     *
     * @return array<string, mixed>  { status|statusDescription, statusCode, transactionId }
     */
    public function statusByReference(string $reference): array
    {
        return $this->auth()
            ->get(config('araka.base_url').'/api/reporting/transactionstatusbyreference/'.$reference)
            ->throw()
            ->json();
    }
}
