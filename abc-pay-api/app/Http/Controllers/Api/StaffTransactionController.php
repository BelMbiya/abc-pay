<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payment\TransactionHistoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : paiements reçus par l'établissement du staff connecté.
 */
class StaffTransactionController extends Controller
{
    public function __construct(private readonly TransactionHistoryService $history) {}

    public function index(Request $request): JsonResponse
    {
        $establishment = $request->attributes->get('establishment');

        return response()->json(['data' => [
            'transactions' => $this->history->forEstablishment($establishment->id),
            'summary' => $this->history->establishmentSummary($establishment->id),
        ]]);
    }
}
