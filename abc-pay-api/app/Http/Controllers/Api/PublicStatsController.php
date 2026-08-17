<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Establishment;
use App\Models\Transaction;
use App\Services\Platform\SettingsService;
use Illuminate\Http\JsonResponse;

/**
 * Statistiques plateforme agrégées, exposées PUBLIQUEMENT pour la landing.
 * Uniquement des agrégats (aucune donnée nominative) : nb d'établissements,
 * nb de paiements confirmés, volume total converti en devise de base.
 */
class PublicStatsController extends Controller
{
    public function index(SettingsService $settings): JsonResponse
    {
        $base = $settings->currency();

        $establishments = Establishment::where('is_active', true)->count();

        // Agrégation par devise puis conversion vers la devise de base (mélange USD/CDF).
        $byCurrency = Transaction::where('status', 'confirmee')
            ->groupBy('currency')
            ->selectRaw('currency, sum(amount) as sum_amount, count(*) as tx_count')
            ->get();

        $payments = 0;
        $volume = 0.0;
        foreach ($byCurrency as $row) {
            $payments += (int) $row->tx_count;
            $volume += $settings->toBase((float) $row->sum_amount, (string) $row->currency);
        }

        return response()->json(['data' => [
            'establishments' => $establishments,
            'payments' => $payments,
            'volume' => round($volume),
            'currency' => $base,
            'operators' => 4, // M-Pesa, Airtel, Orange, Africell
        ]]);
    }
}
