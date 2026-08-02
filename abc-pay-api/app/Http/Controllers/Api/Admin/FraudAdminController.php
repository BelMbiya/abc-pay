<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\FraudFlag;
use App\Services\Fraud\FraudService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super-admin — revue des signalements de fraude (orchestration seule).
 */
class FraudAdminController extends Controller
{
    public function __construct(private readonly FraudService $fraud) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        return response()->json(['data' => [
            'flags' => $this->fraud->list(is_string($status) ? $status : null),
            'open' => $this->fraud->openCount(),
        ]]);
    }

    /** Écarte un signalement (faux positif). */
    public function dismiss(Request $request, FraudFlag $flag): JsonResponse
    {
        return response()->json(['data' => $this->fraud->dismiss($flag, $request->user()?->email ?? 'admin')]);
    }

    /** Bloque le compte de l'auteur et marque le signalement comme traité. */
    public function block(Request $request, FraudFlag $flag): JsonResponse
    {
        return response()->json(['data' => $this->fraud->blockUser($flag, $request->user()?->email ?? 'admin')]);
    }
}
