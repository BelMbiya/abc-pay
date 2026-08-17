<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\RefundStoreRequest;
use App\Http\Requests\StaffRefundDecisionRequest;
use App\Models\Establishment;
use App\Models\Refund;
use App\Models\Transaction;
use App\Services\Payment\RefundService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Remboursements côté back-office établissement : consultation des demandes qui
 * concernent l'établissement du staff, et décision de premier niveau (valider / refuser).
 */
class StaffRefundController extends Controller
{
    public function __construct(private readonly RefundService $refunds) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->refunds->listForEstablishment($this->establishment($request)->id)]);
    }

    /** L'établissement ouvre une demande de remboursement sur un paiement qu'il a reçu. */
    public function store(RefundStoreRequest $request): JsonResponse
    {
        $this->assertDirection($request);
        $establishment = $this->establishment($request);
        $transaction = Transaction::findOrFail($request->validated()['transaction_id']);
        abort_unless($transaction->establishment_id === $establishment->id, 403, 'Ce paiement ne concerne pas votre établissement.');

        // Origine « staff » → la validation de premier niveau de l'établissement est acquise.
        $refund = $this->refunds->request($transaction, $request->validated()['reason'], $request->user()->email ?? 'staff', 'staff');

        return response()->json(['data' => ['id' => $refund->id, 'status' => $refund->status]], 201);
    }

    public function decide(StaffRefundDecisionRequest $request, Refund $refund): JsonResponse
    {
        $this->assertDirection($request);
        $establishment = $this->establishment($request);
        $updated = $this->refunds->establishmentDecide(
            $refund,
            $request->validated()['decision'],
            $request->user()->email ?? 'staff',
            $establishment->id,
        );

        return response()->json(['data' => $updated]);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }

    /** Séparation des tâches (M3) : seule la DIRECTION peut demander/décider un remboursement. */
    private function assertDirection(Request $request): void
    {
        abort_unless($request->attributes->get('staff_role') === 'direction', 403, 'Action réservée à la direction de l\'établissement.');
    }
}
