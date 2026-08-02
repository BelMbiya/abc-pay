<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateSettingsRequest;
use App\Services\Platform\SettingsService;
use Illuminate\Http\JsonResponse;

/** Réglages plateforme : lecture publique (devise), écriture super-admin. */
class SettingsController extends Controller
{
    public function __construct(private readonly SettingsService $settings) {}

    /** Réglages publics (le front en a besoin pour formater les montants). */
    public function index(): JsonResponse
    {
        return response()->json(['data' => $this->settings->all()]);
    }

    /** Mise à jour (super-admin) : devise et/ou taux de change. */
    public function update(UpdateSettingsRequest $request): JsonResponse
    {
        if ($request->has('currency')) {
            $this->settings->setCurrency($request->validated('currency'));
        }
        if ($request->has('usd_cdf_rate')) {
            $this->settings->setUsdCdfRate((float) $request->validated('usd_cdf_rate'));
        }
        if ($request->has('transfer_cap')) {
            $this->settings->setTransferCap((float) $request->validated('transfer_cap'));
        }

        return response()->json(['data' => $this->settings->all()]);
    }
}
