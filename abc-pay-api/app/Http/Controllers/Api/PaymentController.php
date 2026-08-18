<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\PaymentQuoteRequest;
use App\Http\Requests\TuitionPaymentRequest;
use App\Models\Establishment;
use App\Models\Transaction;
use App\Models\User;
use App\Services\Identity\JwtService;
use App\Services\Payment\TransferService;
use App\Services\Payment\TuitionPaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

/**
 * Orchestration seule (DDD) : validation (FormRequest) → service métier → réponse.
 * Aucune logique de calcul ici — tout est dans TuitionPaymentService.
 */
class PaymentController extends Controller
{
    public function __construct(
        private readonly TuitionPaymentService $payments,
        private readonly TransferService $transfers,
        private readonly JwtService $jwt,
    ) {}

    /** Devis des frais de service (recalculés côté serveur). */
    public function quote(PaymentQuoteRequest $request): JsonResponse
    {
        $establishment = Establishment::findOrFail($request->validated('establishment_id'));
        // Pas de devis (ni fuite du taux de commission) pour un établissement non encaissable.
        $this->payments->assertReceivable($establishment);

        return response()->json([
            'data' => $this->payments->quote($establishment, (float) $request->validated('amount')),
        ]);
    }

    /** Crée un paiement Tuition (idempotent) et renvoie la transaction + le reçu. */
    public function store(TuitionPaymentRequest $request): JsonResponse
    {
        $establishment = Establishment::findOrFail($request->validated('establishment_id'));
        $idempotencyKey = $request->header('Idempotency-Key');

        $result = $this->payments->create(
            $establishment,
            $request->validated(),
            $idempotencyKey,
            $this->optionalUserId($request),
        );

        return response()->json(['data' => $result], 201);
    }

    /**
     * Statut d'un paiement (pour la page de retour après redirection CinetPay).
     * Renvoie le statut + le numéro de reçu — JAMAIS le qr_token (secret). L'UUID
     * de transaction n'est pas devinable ; aucune donnée sensible n'est exposée.
     */
    public function status(Transaction $transaction): JsonResponse
    {
        // Fallback webhook : si encore en attente, on demande le statut réel à CinetPay.
        // Dispatch par type : « service » (payeur) vs Tuition (défaut).
        $transaction = $transaction->type === 'service'
            ? $this->transfers->refreshStatus($transaction)
            : $this->payments->refreshStatus($transaction);

        return response()->json(['data' => [
            'status' => $transaction->status, // pending | confirmee | failed
            'receipt' => ['number' => $transaction->receipt?->number],
        ]]);
    }

    /**
     * Résout le payeur authentifié SI un JWT valide accompagne la requête.
     * Le paiement reste public (tiers non connecté) : un jeton absent/invalide
     * n'échoue pas, il rattache simplement la transaction à personne.
     */
    private function optionalUserId(Request $request): ?int
    {
        $token = $request->bearerToken();
        if (! $token) {
            return null;
        }

        try {
            $claims = $this->jwt->parse($token);
        } catch (Throwable) {
            return null;
        }

        if (($claims['type'] ?? null) !== 'access') {
            return null;
        }

        return User::whereKey($claims['sub'] ?? null)->value('id');
    }
}
