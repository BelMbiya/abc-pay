<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\TransactionStoreRequest;
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
}
