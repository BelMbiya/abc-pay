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

        return response()->json(['data' => $this->stats->forEstablishment($establishment->id)]);
    }
}
