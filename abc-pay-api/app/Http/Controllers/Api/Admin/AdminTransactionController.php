<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminTransactionSearchRequest;
use App\Services\Payment\TransactionHistoryService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Orchestration seule (DDD) : vue plateforme des transactions (super-admin).
 * `index` = liste large (compat. tableaux de bord existants) ; `search` = recherche
 * filtrée + paginée (page dédiée) ; `export` = CSV de la sélection.
 */
class AdminTransactionController extends Controller
{
    public function __construct(private readonly TransactionHistoryService $history) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => [
            'transactions' => $this->history->platformWide(),
            'summary' => $this->history->platformSummary(),
        ]]);
    }

    public function search(AdminTransactionSearchRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->history->platformSearch($request->validated())]);
    }

    public function export(AdminTransactionSearchRequest $request): StreamedResponse
    {
        $rows = $this->history->exportRows($request->validated());
        $filename = 'transactions-'.now()->format('Ymd-His').'.csv';

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF"); // BOM UTF-8 → accents corrects dans Excel

            fputcsv($out, [
                'Date', 'Type', 'Sens', 'Statut', 'Acteur', 'Téléphone', 'Établissement',
                'Élève', 'Matricule', 'Contrepartie', 'Libellé', 'Type de frais', 'Canal',
                'Montant', 'Commission', 'Net', 'Total', 'Devise', 'Référence', 'Reçu',
            ]);

            foreach ($rows as $r) {
                fputcsv($out, [
                    $r['created_at'], $r['type'], $r['direction'], $r['status'],
                    $r['actor'], $r['actor_phone'], $r['establishment'],
                    $r['student_name'], $r['student_matricule'], $r['counterparty_name'],
                    $r['label'], $r['fee_type'], $r['channel'],
                    $r['amount'], $r['commission'], $r['net'], $r['total'], $r['currency'],
                    $r['reference'], $r['receipt_number'],
                ]);
            }

            fclose($out);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
