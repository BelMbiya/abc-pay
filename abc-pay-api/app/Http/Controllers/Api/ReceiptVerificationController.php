<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReceiptVerifyRequest;
use App\Services\Document\ReceiptVerificationService;
use Illuminate\Http\JsonResponse;

/**
 * Orchestration seule (DDD) : la logique d'authenticité est dans le service.
 * Réponse uniforme (200) qu'un reçu soit reconnu ou non — pas d'oracle par code HTTP.
 */
class ReceiptVerificationController extends Controller
{
    public function __construct(private readonly ReceiptVerificationService $service) {}

    public function verify(ReceiptVerifyRequest $request): JsonResponse
    {
        $data = $request->validated();

        $receipt = ! empty($data['token'])
            ? $this->service->verifyByToken($data['token'])
            : $this->service->verifyByNumberAndCode($data['number'], $data['code']);

        return response()->json(['data' => [
            'valid' => $receipt !== null,
            'receipt' => $receipt,
        ]]);
    }
}
