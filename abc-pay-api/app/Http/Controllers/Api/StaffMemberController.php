<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreStaffMemberRequest;
use App\Models\Establishment;
use App\Services\Identity\Exceptions\InvalidCredentialsException;
use App\Services\Identity\StaffDirectoryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Gestion du personnel de l'établissement (module Identity).
 * Seul le rôle « direction » peut inviter des membres (RBAC).
 */
class StaffMemberController extends Controller
{
    public function __construct(private readonly StaffDirectoryService $directory) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->directory->listMembers($this->establishment($request))]);
    }

    public function store(StoreStaffMemberRequest $request): JsonResponse
    {
        if ($request->attributes->get('staff_role') !== 'direction') {
            return response()->json(['error' => ['code' => 'forbidden', 'message' => 'Réservé à la direction.']], 403);
        }

        try {
            $member = $this->directory->addMember($this->establishment($request), $request->validated());
        } catch (InvalidCredentialsException $e) {
            return response()->json(['error' => ['code' => 'conflict', 'message' => $e->getMessage()]], 422);
        }

        return response()->json(['data' => $member], 201);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
