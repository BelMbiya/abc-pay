<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RefundStoreRequest;
use App\Models\Transaction;
use App\Services\Payment\RefundService;
use Illuminate\Http\JsonResponse;

/** Remboursements côté PAYEUR : ouvrir une demande sur l'une de ses propres opérations. */
class RefundController extends Controller
{
    public function __construct(private readonly RefundService $refunds) {}

    public function store(RefundStoreRequest $request): JsonResponse
    {
        $user = $request->user();
        $transaction = Transaction::findOrFail($request->validated()['transaction_id']);

        // Le payeur ne peut demander un remboursement que sur SES propres opérations.
        abort_unless($transaction->user_id === $user->id, 403, 'Cette opération ne vous appartient pas.');

        $by = $user->name ?: ($user->phone ?: 'payeur');
        $refund = $this->refunds->request($transaction, $request->validated()['reason'], $by, 'payer');

        return response()->json(['data' => ['id' => $refund->id, 'status' => $refund->status]], 201);
    }
}
