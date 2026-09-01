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
 * Passerelle CinetPay « Aurore » derrière le contrat neutre PaymentGateway (adaptateur).
 * Encapsule le format CinetPay : `payment_method` verrouillé sur le canal, `payment_url`
 * (page hébergée), et remontée LISIBLE des erreurs (details HTTP 200 OU RequestException).
 * La mécanique HTTP reste dans CinetPayClient (fakeable) — ici, uniquement le mapping.
 */
class CinetPayGateway implements PaymentGateway
{
    /** Préfixes opérateurs RDC (2 premiers chiffres du national à 9 chiffres). */
    private const RDC_PREFIXES = [
        'mpesa' => ['81', '82'],
        'airtel' => ['97', '99'],
        'orange' => ['80', '84', '85', '89'],
        'africell' => ['90'],
    ];

    private const OPERATOR_LABEL = [
        'mpesa' => 'M-Pesa', 'airtel' => 'Airtel', 'orange' => 'Orange', 'africell' => 'Africell',
    ];

    public function __construct(private readonly CinetPayClient $client) {}

    public function name(): string
    {
        return 'cinetpay';
    }

    public function enabled(): bool
    {
        return $this->client->enabled();
    }

    public function initPayment(PaymentRequest $r): PaymentInit
    {
        // Garde-fou MONTANT MINIMUM : sous le seuil CinetPay, l'API renvoie un « 2010 FAILED »
        // opaque. On remonte un message CLAIR et actionnable AVANT même l'appel.
        $min = (int) config('cinetpay.min_amount');
        if ($min > 0 && $r->amount < $min) {
            throw new GatewayException("Le montant minimum accepté par CinetPay est de {$min} {$r->currency}. Augmente le montant.");
        }

        // Cohérence numéro ↔ opérateur AVANT d'appeler CinetPay : un numéro d'un AUTRE
        // opérateur (ex. Airtel choisi + numéro M-Pesa 81) est refusé par CinetPay avec un
        // « 2010 FAILED » opaque. On le détecte ici → message clair + zéro appel gaspillé.
        $this->assertPhoneMatchesChannel($r->clientPhone, $r->channel);

        $payload = array_filter([
            'currency' => $r->currency,
            'payment_method' => $this->client->paymentMethodFor($r->channel),
            'merchant_transaction_id' => $r->merchantRef,
            'amount' => $r->amount,
            'lang' => 'fr',
            'designation' => $r->designation,
            'client_email' => $r->clientEmail,
            'client_first_name' => $r->clientFirstName,
            'client_last_name' => $r->clientLastName,
            'client_phone_number' => $r->clientPhone,
            'success_url' => $r->successUrl,
            'failed_url' => $r->failedUrl,
            'notify_url' => $r->notifyUrl,
        ], fn ($v) => $v !== null && $v !== '');

        try {
            $init = $this->client->initPayment($payload);
        } catch (RequestException $e) {
            // Erreur RENVOYÉE par CinetPay (IP non autorisée, clés invalides…).
            $this->client->forgetToken(); // au cas où le jeton en cache serait périmé
            $body = (array) ($e->response?->json() ?? []);
            throw new GatewayException('Paiement refusé par CinetPay : '.self::humanReason($body));
        }

        // CinetPay renvoie souvent la raison RÉELLE dans `details` (HTTP 200, ex.
        // INVALID_PARAMS / CURRENCY_NOT_ALLOWED) SANS payment_url : on échoue clairement.
        $paymentUrl = $init['payment_url'] ?? null;
        if (! $paymentUrl) {
            // Un jeton périmé (minté avant l'autorisation IP) fait échouer en « FAILED » :
            // on le purge pour que la prochaine tentative se re-connecte proprement.
            $this->client->forgetToken();
            throw new GatewayException('CinetPay : '.self::humanReason((array) ($init['details'] ?? [])));
        }

        return new PaymentInit(
            reference: $r->merchantRef,
            redirectUrl: $paymentUrl,
            paymentToken: $init['payment_token'] ?? null,
            notifyToken: $init['notify_token'] ?? null,
            providerRef: $init['transaction_id'] ?? null,
        );
    }

    /**
     * Motif LISIBLE à partir d'un bloc d'erreur CinetPay (RequestException OU `details`).
     * Détecte le cas fréquent et actionnable « IP du serveur non autorisée » (code 2011 /
     * NOT_ALLOWED / message « withlisted »), sinon renvoie le message + code/statut utiles.
     * PUBLIC/STATIC : réutilisé par le reversement (SettlementService) — même format d'erreur
     * pour l'encaissement ET le transfert.
     */
    public static function humanReason(array $info): string
    {
        $status = strtoupper((string) ($info['status'] ?? ''));
        $code = (string) ($info['code'] ?? '');
        $message = $info['description'] ?? $info['message'] ?? null;
        if (! empty($info['errors']) && is_array($info['errors'])) {
            $message = collect($info['errors'])->flatten()->first() ?: $message;
        }

        $isNotAllowed = $status === 'NOT_ALLOWED' || $code === '2011'
            || ($message && preg_match('/with?list/i', $message));
        if ($isNotAllowed) {
            return "l'IP du serveur n'est pas autorisée par CinetPay. Ajoute l'IP publique du serveur "
                ."dans le panel CinetPay (API & sécurité → IP autorisées), puis réessaie.";
        }

        $reason = $message ?: 'opération refusée'; // neutre (encaissement ET transfert)
        if ($code !== '' && $status !== '') {
            $reason .= ' (code '.$code.' '.$status.')'; // trace utile au diagnostic
        }

        return $reason;
    }

    /**
     * Rejette un numéro qui appartient CLAIREMENT à un autre opérateur RDC que le canal
     * choisi (ex. canal Airtel + numéro M-Pesa 81) — sinon CinetPay renvoie un « 2010
     * FAILED » opaque. Sur un préfixe inconnu, on NE bloque PAS (on laisse passer).
     *
     * @throws GatewayException  message clair pour le payeur
     */
    private function assertPhoneMatchesChannel(?string $phone, string $channel): void
    {
        $allowed = self::RDC_PREFIXES[$channel] ?? null;
        if (! $phone || ! $allowed) {
            return; // pas de numéro, ou canal non mobile (carte) → rien à valider
        }

        // National à 9 chiffres : on retire l'indicatif 243 / le 0 initial.
        $digits = preg_replace('/\D/', '', $phone);
        if (str_starts_with((string) $digits, '243')) {
            $digits = substr($digits, 3);
        }
        $digits = ltrim((string) $digits, '0');
        if (strlen($digits) < 2) {
            return;
        }
        $prefix = substr($digits, 0, 2);

        if (in_array($prefix, $allowed, true)) {
            return; // le numéro correspond bien à l'opérateur
        }

        // Le préfixe appartient-il explicitement à un AUTRE opérateur connu ?
        foreach (self::RDC_PREFIXES as $op => $prefixes) {
            if ($op !== $channel && in_array($prefix, $prefixes, true)) {
                $label = self::OPERATOR_LABEL[$channel] ?? $channel;
                throw new GatewayException(
                    "Le numéro ne correspond pas à l'opérateur $label choisi. "
                    ."Utilise un numéro $label (préfixe ".implode(', ', $allowed).") ou change d'opérateur."
                );
            }
        }
        // Préfixe inconnu : on ne bloque pas (CinetPay tranchera).
    }

    public function checkPayment(string $reference): PaymentState
    {
        $status = strtoupper((string) ($this->client->checkPayment($reference)['status'] ?? ''));

        return match (true) {
            in_array($status, ['SUCCESS', 'SUCCES', 'ACCEPTED', 'COMPLETED'], true) => PaymentState::Success,
            $status === 'FAILED' => PaymentState::Failed,
            default => PaymentState::Pending,
        };
    }

    public function payoutEnabled(): bool
    {
        // Module « Transferts d'argent » CinetPay : activation SÉPARÉE de l'encaissement
        // (+ solde approvisionné). OFF → reversement = acte comptable (marqué « payé »).
        return $this->client->enabled() && (bool) config('cinetpay.transfer_enabled');
    }

    public function sendTransfer(TransferRequest $r): TransferResult
    {
        // `merchant_transaction_id` = id du Settlement : matché par le webhook de transfert
        // (POST /webhooks/cinetpay/transfer) qui posera « paid » si le décaissement est asynchrone.
        $payload = array_filter([
            'currency' => $r->currency,
            'payment_method' => $this->resolveTransferMethod($r->channel),
            'merchant_transaction_id' => $r->reference,
            'amount' => (int) round($r->amount),
            'phone_number' => $r->phone,
            'reason' => $r->reason,
            'notify_url' => config('cinetpay.notify_base').'/api/v1/webhooks/cinetpay/transfer',
        ], fn ($v) => $v !== null && $v !== '');

        try {
            $res = $this->client->sendTransfer($payload);
        } catch (RequestException $e) {
            // Même format d'erreur lisible que l'encaissement (IP non autorisée, etc.).
            $this->client->forgetToken(); // au cas où le jeton en cache serait périmé
            $body = (array) ($e->response?->json() ?? []);
            throw new GatewayException('Reversement refusé par CinetPay : '.self::humanReason($body));
        }

        // Init transfert ACCEPTÉE = code 2002 (PENDING) ou 100 (SUCCESS immédiat). CinetPay
        // peut répondre HTTP 200 avec `2010 FAILED` (ex. module inactif) : on remonte la
        // VRAIE raison et on lève (jamais un faux « en cours »).
        $code = (string) ($res['code'] ?? '');
        $status = strtoupper((string) ($res['status'] ?? ''));
        if ($code !== '2002' && ! in_array($status, ['PENDING', 'SUCCESS', 'SUCCES'], true)) {
            $info = (! empty($res['details']) && is_array($res['details'])) ? $res['details'] : $res;
            throw new GatewayException('Reversement refusé par CinetPay : '.self::humanReason($info));
        }

        // Transfert RDC souvent confirmé immédiatement (code 100 / SUCCESS) → « payé » tout de
        // suite (indispensable en local). Sinon (PENDING/2002) → le webhook posera « paid ».
        $done = $code === '100' || in_array($status, ['SUCCESS', 'SUCCES', 'COMPLETED'], true);

        return new TransferResult(
            state: $done ? PaymentState::Success : PaymentState::Pending,
            providerRef: $res['transaction_id'] ?? ($res['data']['transaction_id'] ?? null),
            notifyToken: $res['notify_token'] ?? ($res['data']['notify_token'] ?? null),
        );
    }

    /**
     * Code opérateur CinetPay pour un décaissement. Tolérant : accepte le canal abc pay
     * (mpesa → MPESA_CD, via method_map — cas du remboursement, qui porte `channel`) COMME
     * un code CinetPay déjà résolu (MPESA_CD, FLOOZ… — cas du reversement, qui porte
     * `payout_method`). Vide → méthode de transfert par défaut.
     */
    private function resolveTransferMethod(?string $channel): ?string
    {
        if ($channel === null || $channel === '') {
            return config('cinetpay.default_transfer_method');
        }
        $map = (array) config('cinetpay.method_map', []);

        return $map[strtolower($channel)] ?? $channel; // canal → code, sinon code tel quel
    }
}
