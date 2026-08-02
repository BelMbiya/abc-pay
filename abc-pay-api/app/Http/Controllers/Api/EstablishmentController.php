<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Tenancy\EstablishmentDirectory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : délègue la recherche au service Tenancy.
 */
class EstablishmentController extends Controller
{
    public function __construct(private readonly EstablishmentDirectory $directory) {}

    /** Liste / recherche des établissements partenaires (parcours Tuition). */
    public function index(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->directory->search($request->query('query')),
        ]);
    }
}
