<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateUserRequest;
use App\Models\User;
use App\Services\Identity\Exceptions\UserActionException;
use App\Services\Identity\UserManagementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Super-admin — gestion des comptes utilisateurs (orchestration seule).
 */
class AdminUserController extends Controller
{
    public function __construct(private readonly UserManagementService $users) {}

    public function index(Request $request): JsonResponse
    {
        $q = $request->query('q');

        return response()->json(['data' => $this->users->list(is_string($q) ? $q : null)]);
    }

    public function store(CreateUserRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->users->create($request->validated())], 201);
    }

    public function show(User $user): JsonResponse
    {
        return response()->json(['data' => $this->users->show($user)]);
    }

    public function block(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate(['reason' => ['nullable', 'string', 'max:255']]);

        return response()->json(['data' => $this->users->block($user, $validated['reason'] ?? null)]);
    }

    public function unblock(User $user): JsonResponse
    {
        return response()->json(['data' => $this->users->unblock($user)]);
    }

    /** Déconnexion forcée (révoque toutes les sessions). */
    public function disconnect(User $user): JsonResponse
    {
        return response()->json(['data' => $this->users->disconnect($user)]);
    }

    public function destroy(User $user): JsonResponse
    {
        try {
            $this->users->delete($user);
        } catch (UserActionException $e) {
            return response()->json(['error' => ['code' => 'cannot_delete', 'message' => $e->getMessage()]], 422);
        }

        return response()->json(['data' => ['deleted' => true]]);
    }
}
