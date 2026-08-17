<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Establishment;
use App\Services\Identity\StaffDirectoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Personnel de l'établissement (module Identity) — consultation seule.
 * L'invitation de nouveaux membres a été retirée (décision produit).
 */
class StaffMemberController extends Controller
{
    public function __construct(private readonly StaffDirectoryService $directory) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->directory->listMembers($this->establishment($request))]);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
