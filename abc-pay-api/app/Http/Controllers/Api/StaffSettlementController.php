<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Payment\SettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : reversements de l'établissement du staff connecté.
 */
class StaffSettlementController extends Controller
{
    public function __construct(private readonly SettlementService $settlements) {}

    public function index(Request $request): JsonResponse
    {
        $establishment = $request->attributes->get('establishment');

        return response()->json(['data' => $this->settlements->forEstablishment($establishment->id)]);
    }
}
