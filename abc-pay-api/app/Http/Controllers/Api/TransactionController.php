<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransactionStoreRequest;
use App\Models\Transaction;
use App\Services\Payment\TransactionHistoryService;
use App\Services\Payment\TransferService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : historique + enregistrement des transactions du payeur (JWT).
 */
class TransactionController extends Controller
{
    public function __construct(
        private readonly TransactionHistoryService $history,
        private readonly TransferService $transfers,
    ) {}

    /** Liste les transactions du payeur authentifié (les plus récentes d'abord). */
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->history->forUser($request->user())]);
    }

    /** Enregistre une transaction non-Tuition (envoi P2P, paiement de service). */
    public function store(TransactionStoreRequest $request): JsonResponse
    {
        $result = $this->transfers->create(
            $request->user(),
            $request->validated(),
            $request->header('Idempotency-Key'),
        );

        return response()->json(['data' => $result], 201);
    }

    /**
     * Reçu COMPLET d'une transaction (numéro + jeton d'authenticité), réservé au
     * TITULAIRE. Sert à re-générer le PDF avec son QR depuis l'historique : le `qr_token`
     * est un secret jamais listé, mais le propriétaire peut le récupérer pour SON reçu.
     */
    public function receipt(Request $request, Transaction $transaction): JsonResponse
    {
        abort_unless($transaction->user_id && $transaction->user_id === $request->user()->id, 403);

        $receipt = $transaction->receipt;

        return response()->json(['data' => [
            'number' => $receipt?->number,
            'qr_token' => $receipt?->qr_token,
        ]]);
    }
}
