<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeadUpdateRequest;
use App\Models\Lead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * Gestion des demandes de démo / partenariat (super-admin) : consultation,
 * avancement du statut dans le pipeline commercial, et suppression.
 */
class LeadAdminController extends Controller
{
    public function index(): JsonResponse
    {
        $leads = Lead::query()->latest()->limit(200)->get([
            'id', 'establishment_name', 'contact_name', 'phone', 'email', 'contact_channel', 'profile', 'message', 'status', 'created_at',
        ]);

        return response()->json(['data' => $leads]);
    }

    public function update(LeadUpdateRequest $request, Lead $lead): JsonResponse
    {
        $lead->update($request->validated());

        return response()->json(['data' => $lead]);
    }

    public function destroy(Lead $lead): Response
    {
        $lead->delete();

        return response()->noContent();
    }
}
