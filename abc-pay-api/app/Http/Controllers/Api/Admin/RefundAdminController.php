<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RefundDecisionRequest;
use App\Http\Requests\RefundStoreRequest;
use App\Models\Refund;
use App\Models\Transaction;
use App\Services\Payment\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestion des remboursements (super-admin) : demande, décision (4 yeux), consultation.
 * Orchestration seule — la logique métier est dans {@see RefundService}.
 */
class RefundAdminController extends Controller
{
    public function __construct(private readonly RefundService $refunds) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        return response()->json(['data' => $this->refunds->list(is_string($status) ? $status : null)]);
    }

    public function store(RefundStoreRequest $request): JsonResponse
    {
        $data = $request->validated();
        $transaction = Transaction::findOrFail($data['transaction_id']);
        $refund = $this->refunds->request($transaction, $data['reason'], $request->user()->email ?? 'admin');

        return response()->json(['data' => $refund], 201);
    }

    public function decide(RefundDecisionRequest $request, Refund $refund): JsonResponse
    {
        $data = $request->validated();
        $updated = $this->refunds->adminDecide(
            $refund,
            $data['decision'],
            $request->user()->email ?? 'admin',
            $data['note'] ?? null,
            (bool) ($data['force'] ?? false),
        );

        return response()->json(['data' => $updated]);
    }
}
