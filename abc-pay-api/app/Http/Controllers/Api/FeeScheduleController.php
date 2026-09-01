<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeScheduleRequest;
use App\Http\Requests\UpdateFeeScheduleRequest;
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

    public function update(UpdateFeeScheduleRequest $request, string $feeSchedule): JsonResponse
    {
        // Résolution SCOPÉE à l'établissement du staff (isolation tenant).
        $schedule = $this->establishment($request)->feeSchedules()->findOrFail($feeSchedule);

        return response()->json(['data' => $this->billing->updateSchedule($schedule, $request->validated())]);
    }

    public function destroy(Request $request, string $feeSchedule): JsonResponse
    {
        $schedule = $this->establishment($request)->feeSchedules()->findOrFail($feeSchedule);
        $this->billing->deleteSchedule($schedule);

        return response()->json(['data' => ['status' => 'deleted']]);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
