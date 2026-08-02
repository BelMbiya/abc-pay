<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Payment\TransactionHistoryService;
use Illuminate\Http\JsonResponse;

/**
 * Orchestration seule (DDD) : vue plateforme des transactions (super-admin).
 */
class AdminTransactionController extends Controller
{
    public function __construct(private readonly TransactionHistoryService $history) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => [
            'transactions' => $this->history->platformWide(),
            'summary' => $this->history->platformSummary(),
        ]]);
    }
}
