<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Reporting\StatsService;
use Illuminate\Http\JsonResponse;

/** Vue d'ensemble plateforme (super-admin). */
class AdminDashboardController extends Controller
{
    public function __construct(private readonly StatsService $stats) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->stats->platform()]);
    }
}
