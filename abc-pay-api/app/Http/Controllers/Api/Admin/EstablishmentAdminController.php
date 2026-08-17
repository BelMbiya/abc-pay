<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\OnboardEstablishmentRequest;
use App\Http\Requests\UpdateEstablishmentLoginRequest;
use App\Http\Requests\UpdateEstablishmentRequest;
use App\Models\Establishment;
use App\Services\Tenancy\EstablishmentProvisioningService;
use App\Services\Tenancy\Exceptions\EstablishmentActionException;
use Illuminate\Http\JsonResponse;

/**
 * Orchestration seule (DDD) : administration des établissements et de leur compte
 * de connexion (super-admin). Toute la logique est dans le service Tenancy.
 */
class EstablishmentAdminController extends Controller
{
    public function __construct(private readonly EstablishmentProvisioningService $provisioning) {}

    /** Liste des établissements + leur compte de connexion (direction). */
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->provisioning->list()]);
    }

    /** Crée un établissement AVEC son compte de connexion. */
    public function store(OnboardEstablishmentRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->provisioning->create($request->validated())], 201);
    }

    /** Modifie les informations d'un établissement (nom, type, ville, commission, statut). */
    public function update(UpdateEstablishmentRequest $request, Establishment $establishment): JsonResponse
    {
        return response()->json(['data' => $this->provisioning->update($establishment, $request->validated())]);
    }

    /** Modifie le compte de connexion (email / mot de passe / nom) d'un établissement. */
    public function updateLogin(UpdateEstablishmentLoginRequest $request, Establishment $establishment): JsonResponse
    {
        return response()->json(['data' => $this->provisioning->updateLogin($establishment, $request->validated())]);
    }

    /** Supprime définitivement un établissement (refusé s'il a un historique de transactions). */
    public function destroy(Establishment $establishment): JsonResponse
    {
        try {
            $this->provisioning->delete($establishment);
        } catch (EstablishmentActionException $e) {
            return response()->json(['error' => ['code' => 'cannot_delete', 'message' => $e->getMessage()]], 422);
        }

        return response()->json(['data' => ['deleted' => true]]);
    }
}
