<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UploadEstablishmentDocumentRequest;
use App\Models\Establishment;
use App\Services\Tenancy\EstablishmentDocuments;
use App\Services\Tenancy\EstablishmentDocumentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : documents KYB de l'établissement du staff connecté.
 * L'établissement DÉPOSE ses pièces (numéro + fichier) ; l'admin les revoit ensuite.
 */
class StaffDocumentController extends Controller
{
    private const DISK = 'local';

    public function __construct(private readonly EstablishmentDocumentService $documents) {}

    /** État des pièces exigées / fournies pour SON établissement. */
    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->documents->overview($this->establishment($request))]);
    }

    /** Dépose (ou remplace) une pièce : numéro et/ou fichier → repasse en « pending ». */
    public function store(UploadEstablishmentDocumentRequest $request): JsonResponse
    {
        $establishment = $this->establishment($request);
        $type = $request->validated('type');

        // Le type doit être APPLICABLE à cet établissement (ex. agrément ministère = écoles).
        abort_unless(in_array($type, EstablishmentDocuments::applicableKeys($establishment), true), 422, 'Document non applicable à cet établissement.');

        $filePath = null;
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $filePath = $file->storeAs(
                "establishment-documents/{$establishment->id}",
                $type.'.'.strtolower($file->extension()),
                self::DISK,
            );
        }

        $doc = $this->documents->upsert($establishment, $type, [
            'number' => $request->validated('number'),
            'file_path' => $filePath,        // null si simple mise à jour du numéro
            'status' => 'pending',           // tout (re)dépôt attend une revue
            'note' => null,
        ]);

        return response()->json(['data' => [
            'type' => $doc->type,
            'number' => $doc->number,
            'has_file' => (bool) $doc->file_path,
            'status' => $doc->status,
            'completeness' => $this->documents->completeness($establishment->fresh()),
        ]], 201);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
