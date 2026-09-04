<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Reporting\StatsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Tableau de bord de l'établissement du staff connecté (DDD : orchestration). */
class StaffDashboardController extends Controller
{
    public function __construct(private readonly StatsService $stats) {}

    public function index(Request $request): JsonResponse
    {
        $establishment = $request->attributes->get('establishment');

        // Période de filtrage des flux (défaut : aujourd'hui). Validée côté service (allowlist).
        $period = (string) $request->query('period', 'today');

        // Nom de l'établissement porté par le dashboard → l'accueil l'affiche toujours,
        // sans dépendre de l'ancienneté de la session (payload de login).
        $data = $this->stats->forEstablishment($establishment->id, $period);
        $data['establishment_name'] = $establishment->name;
        // Statut « Verified » (KYC/KYB validés) → badge dans l'espace établissement.
        $data['verified'] = $establishment->isFullyVerified();

        return response()->json(['data' => $data]);
    }
}
