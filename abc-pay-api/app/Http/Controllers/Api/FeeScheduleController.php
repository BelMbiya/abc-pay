<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeScheduleRequest;
use App\Models\Establishment;
use App\Services\Billing\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Barème par promotion (module Billing). Orchestration seule (DDD).
 * Établissement = celui du staff authentifié.
 */
class FeeScheduleController extends Controller
{
    public function __construct(private readonly BillingService $billing) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->billing->listSchedules($this->establishment($request))]);
    }

    public function store(StoreFeeScheduleRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->billing->createSchedule($this->establishment($request), $request->validated())], 201);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
