<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\Transaction;
use App\Services\Payment\TransferService;
use App\Services\Payment\TuitionPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Callback Araka (`redirectURL`). Route SANS JWT. Défense en profondeur :
 *  1. Vérif de la SIGNATURE HMAC (X-APP-SIGNATURE) si une clé est configurée.
 *  2. On ne FAIT PAS confiance au corps : la notification n'est qu'un DÉCLENCHEUR, et
 *     `refreshStatus` relit le statut AUTORITAIRE « par référence » auprès d'Araka.
 * Un rejeu ou un appel forgé est donc inoffensif. Idempotent.
 */
class ArakaController extends Controller
{
    public function __construct(
        private readonly TuitionPaymentService $tuition,
        private readonly TransferService $transfers,
    ) {}

    public function payment(Request $request): JsonResponse
    {
        // 1) Signature HMAC (si configurée). base64(HMAC-SHA256(corps brut, clé partagée)).
        if ($key = config('araka.hmac_key')) {
            $sig = (string) $request->header('X-APP-SIGNATURE');
            $expected = base64_encode(hash_hmac('sha256', $request->getContent(), $key, true));
            abort_unless($sig !== '' && hash_equals($expected, $sig), 403);
        }

        // 2) Localisation de la transaction (notre référence, sinon l'id Araka mémorisé).
        $data = $request->all();
        $ourRef = $data['originatingTransactionId'] ?? $data['transactionReference'] ?? null;
        $providerId = $data['transactionId'] ?? null;

        $transaction = $ourRef ? Transaction::where('gateway_ref', $ourRef)->first() : null;
        if (! $transaction && $providerId) {
            $transaction = Transaction::where('payment_token', $providerId)->first();
        }

        // 3) Re-vérif autoritaire + confirm/fail (idempotent), dispatch par type.
        if ($transaction) {
            $transaction->type === 'service'
                ? $this->transfers->refreshStatus($transaction)
                : $this->tuition->refreshStatus($transaction);
        }

        return response()->json(['ok' => true]);
    }
}
