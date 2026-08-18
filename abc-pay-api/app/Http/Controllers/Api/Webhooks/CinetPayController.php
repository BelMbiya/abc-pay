<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\Settlement;
use App\Models\Transaction;
use App\Services\Payment\TransferService;
use App\Services\Payment\TuitionPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Webhooks CinetPay « Aurore » (notify_url). Routes SANS JWT — protégées par le
 * `notify_token` (secret PAR transaction/reversement, obtenu à l'initialisation).
 *  - payment  : confirme/échoue l'encaissement (SUCCESS/FAILED).
 *  - transfer : met à jour le reversement.
 * Idempotent : une notification peut être rejouée.
 *
 * NB : le format exact de la notification (noms de champs, éventuelle signature) est à
 * confirmer sur la section « Notification de transaction » du panel — implémentation
 * défensive sur les champs usuels ci-dessous.
 */
class CinetPayController extends Controller
{
    public function __construct(
        private readonly TuitionPaymentService $tuition,
        private readonly TransferService $transfers,
    ) {}

    /**
     * Notification d'ENCAISSEMENT (paiement web). On ne fait PAS confiance au corps :
     * la notification ne sert que de DÉCLENCHEUR, et `refreshStatus` va lire le statut
     * AUTORITAIRE via l'endpoint « Statut du paiement » de CinetPay. Un rejeu ou un
     * appel forgé est donc inoffensif (seule la vérité CinetPay confirme).
     */
    public function payment(Request $request): JsonResponse
    {
        $data = $request->all();
        $ref = $data['merchant_transaction_id'] ?? null;

        $transaction = $ref ? Transaction::where('gateway_ref', $ref)->first() : null;
        if ($transaction) {
            // Re-vérif autoritaire + confirm/fail (idempotent), dispatch par type.
            $transaction->type === 'service'
                ? $this->transfers->refreshStatus($transaction)
                : $this->tuition->refreshStatus($transaction);
        }

        return response()->json(['ok' => true]);
    }

    /** Notification de REVERSEMENT (transfert). */
    public function transfer(Request $request): JsonResponse
    {
        $data = $request->all();
        $merchantTxId = $data['merchant_transaction_id'] ?? $data['client_transaction_id'] ?? null;

        $settlement = Settlement::query()
            ->when($merchantTxId, fn ($q) => $q->where('id', $merchantTxId))
            ->when($data['transaction_id'] ?? null, fn ($q, $v) => $q->orWhere('gateway_transfer_id', $v))
            ->first();

        if (! $settlement) {
            return response()->json(['ok' => true]);
        }

        $token = $data['notify_token'] ?? $request->header('x-token');
        abort_unless($settlement->notify_token && hash_equals($settlement->notify_token, (string) $token), 403);

        $status = strtoupper((string) ($data['status'] ?? ''));
        if (in_array($status, ['SUCCESS', 'SUCCES', 'VALIDATED', 'CONFIRMED', 'COMPLETED'], true)) {
            if ($settlement->status !== 'paid') {
                $settlement->forceFill(['status' => 'paid', 'paid_at' => now()])->save();
            }
        } elseif (in_array($status, ['FAILED', 'REJECTED', 'CANCELED'], true) && $settlement->status !== 'paid') {
            $settlement->forceFill(['status' => 'failed'])->save();
            Transaction::where('settlement_id', $settlement->id)->update(['settlement_id' => null]);
        }

        return response()->json(['ok' => true]);
    }
}
