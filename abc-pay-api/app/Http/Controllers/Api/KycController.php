<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\KycSubmitRequest;
use App\Services\Identity\KycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** KYC côté payeur : dépôt des pièces (stockage privé) et consultation de son statut. */
class KycController extends Controller
{
    public function __construct(private readonly KycService $kyc) {}

    public function status(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->kyc->present($request->user())]);
    }

    public function submit(KycSubmitRequest $request): JsonResponse
    {
        $this->kyc->submit($request->user(), [
            'front' => $request->file('front'),
            'back' => $request->file('back'),
            'selfie' => $request->file('selfie'),
        ]);

        return response()->json(['data' => $this->kyc->present($request->user()->refresh())], 201);
    }
}
