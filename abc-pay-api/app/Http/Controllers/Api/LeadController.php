<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\LeadStoreRequest;
use App\Models\Lead;
use App\Services\Notification\AdminNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

/**
 * Réception des demandes de démo / partenariat de la landing (public, rate-limité).
 */
class LeadController extends Controller
{
    public function __construct(private readonly AdminNotificationService $notifications) {}

    public function store(LeadStoreRequest $request): JsonResponse
    {
        $lead = Lead::create($request->validated() + ['source' => 'landing', 'status' => 'nouveau']);

        $channelLabel = ['whatsapp' => 'WhatsApp', 'email' => 'email', 'appel' => 'appel'][$lead->contact_channel] ?? null;

        // Alerte le fil super-admin. Best-effort : une notification en échec ne doit
        // jamais faire échouer l'enregistrement de la demande côté visiteur public.
        try {
            $this->notifications->push(
                type: 'lead',
                level: 'info',
                title: 'Nouvelle demande de démo',
                body: trim($lead->establishment_name.' — '.$lead->contact_name)
                    .($channelLabel ? ' · à contacter par '.$channelLabel : ''),
                meta: ['lead_id' => $lead->id],
            );
        } catch (\Throwable $e) {
            Log::warning('Notification admin (lead) non émise', ['lead_id' => $lead->id, 'error' => $e->getMessage()]);
        }

        return response()->json(['data' => ['id' => $lead->id, 'status' => $lead->status]], 201);
    }
}
