<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Establishment;
use App\Services\Payment\Exceptions\NothingToSettleException;
use App\Services\Payment\SettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : reversements abc pay → établissement (super-admin).
 * Permet de VOIR ce qui est en attente et d'EXÉCUTER le reversement (statut → reversé).
 */
class SettlementAdminController extends Controller
{
    public function __construct(private readonly SettlementService $settlements) {}

    /** En attente + historique des reversements d'un établissement. */
    public function index(Establishment $establishment): JsonResponse
    {
        return response()->json(['data' => [
            'establishment' => ['id' => $establishment->id, 'name' => $establishment->name, 'currency' => $establishment->currency],
            'pending' => $this->settlements->pendingFor($establishment->id),
            'history' => $this->settlements->forEstablishment($establishment->id)['settlements'],
        ]]);
    }

    /** Exécute le reversement des encaissements en attente (acte comptable). */
    public function store(Request $request, Establishment $establishment): JsonResponse
    {
        $validated = $request->validate([
            'reference' => ['nullable', 'string', 'max:120'],
        ]);

        try {
            $settlement = $this->settlements->execute(
                $establishment,
                isset($validated['reference']) ? trim((string) $validated['reference']) : null,
                $request->user()?->id,
            );
        } catch (NothingToSettleException $e) {
            return response()->json([
                'error' => ['code' => 'nothing_to_settle', 'message' => "Aucun encaissement en attente à reverser pour cet établissement."],
            ], 422);
        }

        return response()->json(['data' => [
            'id' => $settlement->id,
            'net' => (float) $settlement->net,
            'gross' => (float) $settlement->gross,
            'commission' => (float) $settlement->commission,
            'transactions_count' => (int) $settlement->transactions_count,
            'status' => $settlement->status,
            'reference' => $settlement->reference,
            'paid_at' => $settlement->paid_at?->toDateString(),
        ]], 201);
    }
}
