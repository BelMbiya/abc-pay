<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Establishment;
use App\Models\EstablishmentDocument;
use App\Services\Tenancy\EstablishmentDocuments;
use App\Services\Tenancy\EstablishmentDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Orchestration seule (DDD) : documents KYB (RDC) d'un établissement, côté super-admin.
 * Voir l'état des pièces exigées vs fournies, et statuer (approuver / rejeter / saisir un n°).
 */
class EstablishmentDocumentAdminController extends Controller
{
    public function __construct(private readonly EstablishmentDocumentService $documents) {}

    /** Catalogue + pièces fournies + complétude. */
    public function index(Establishment $establishment): JsonResponse
    {
        return response()->json(['data' => $this->documents->overview($establishment)]);
    }

    /** Crée/actualise une pièce (numéro / statut de revue). */
    public function store(Request $request, Establishment $establishment): JsonResponse
    {
        $validated = $request->validate([
            'type' => ['required', 'string', Rule::in(EstablishmentDocuments::applicableKeys($establishment))],
            'number' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', Rule::in(['pending', 'approved', 'rejected'])],
            'note' => ['nullable', 'string', 'max:300'],
        ]);

        $doc = $this->documents->upsert($establishment, $validated['type'], [
            'number' => $validated['number'] ?? null,
            'status' => $validated['status'] ?? null,
            'note' => $validated['note'] ?? null,
            'reviewed_by' => $request->user()?->id,
        ]);

        return response()->json(['data' => [
            'type' => $doc->type,
            'number' => $doc->number,
            'status' => $doc->status,
            'note' => $doc->note,
            'completeness' => $this->documents->completeness($establishment->fresh()),
        ]]);
    }

    /** Télécharge/affiche la pièce téléversée par l'établissement (stockage privé). */
    public function file(Establishment $establishment, string $type): StreamedResponse
    {
        $doc = EstablishmentDocument::where('establishment_id', $establishment->id)
            ->where('type', $type)
            ->first();

        abort_if(! $doc || ! $doc->file_path || ! Storage::disk('local')->exists($doc->file_path), 404);

        return Storage::disk('local')->response($doc->file_path);
    }
}
