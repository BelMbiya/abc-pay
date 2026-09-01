<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreFeeTypeRequest;
use App\Http\Requests\UpdateFeeTypeRequest;
use App\Models\Establishment;
use App\Services\Billing\BillingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : délègue au BillingService.
 * Établissement = celui du staff authentifié (lié par le middleware `staff`).
 */
class FeeTypeController extends Controller
{
    public function __construct(private readonly BillingService $billing) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->billing->listFeeTypes($this->establishment($request))]);
    }

    public function store(StoreFeeTypeRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->billing->createFeeType($this->establishment($request), $request->validated())], 201);
    }

    public function update(UpdateFeeTypeRequest $request, string $feeType): JsonResponse
    {
        $type = $this->establishment($request)->feeTypes()->findOrFail($feeType);

        return response()->json(['data' => $this->billing->updateFeeType($type, $request->validated())]);
    }

    public function destroy(Request $request, string $feeType): JsonResponse
    {
        $type = $this->establishment($request)->feeTypes()->findOrFail($feeType);
        $this->billing->deleteFeeType($type);

        return response()->json(['data' => ['status' => 'deleted']]);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
