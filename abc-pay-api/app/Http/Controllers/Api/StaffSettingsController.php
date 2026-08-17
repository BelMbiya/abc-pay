<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateEstablishmentSettingsRequest;
use App\Models\Establishment;
use App\Services\Platform\SettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Réglages propres à l'établissement du staff connecté (lecture + mise à jour). */
class StaffSettingsController extends Controller
{
    public function __construct(private readonly SettingsService $settings) {}

    public function show(Request $request): JsonResponse
    {
        $e = $this->establishment($request);

        return response()->json(['data' => [
            'settings' => $e->resolvedSettings(),
            'platform_refund_window_days' => $this->settings->refundWindowDays(),
        ]]);
    }

    public function update(UpdateEstablishmentSettingsRequest $request): JsonResponse
    {
        // Sensible : réservé à la direction (séparation des tâches, cf. M3).
        abort_unless($request->attributes->get('staff_role') === 'direction', 403, 'Réglages réservés à la direction.');

        $e = $this->establishment($request);
        // On ne fusionne QUE les clés connues (jamais d'écriture arbitraire dans le JSON).
        $merged = array_merge($e->resolvedSettings(), $request->validated());
        $e->forceFill(['settings' => $merged])->save();

        return response()->json(['data' => ['settings' => $e->resolvedSettings()]]);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $e */
        $e = $request->attributes->get('establishment');

        return $e;
    }
}
