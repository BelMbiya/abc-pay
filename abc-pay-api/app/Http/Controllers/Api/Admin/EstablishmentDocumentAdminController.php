<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Establishment;
use App\Models\EstablishmentDocument;
use App\Models\EstablishmentStaff;
use App\Models\User;
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

    /** Catalogue + pièces fournies + complétude + identité (KYC) du responsable. */
    public function index(Request $request, Establishment $establishment): JsonResponse
    {
        $data = $this->documents->overview($establishment);

        // Le bloc « responsable » (KYC : nom/téléphone/statut) n'est exposé qu'aux admins
        // habilités à la revue KYC — un admin « establishments.manage » seul ne le voit pas.
        $admin = $request->user();
        $data['director'] = ($admin instanceof \App\Models\Admin && $admin->hasPermission('kyc.review'))
            ? $this->director($establishment)
            : null;

        return response()->json(['data' => $data]);
    }

    /**
     * Responsable (compte « direction ») + son statut KYC — pour que l'admin puisse
     * confirmer/modifier l'identité MÊME si le responsable n'a rien soumis via la plateforme
     * (vérification hors-ligne). Décision posée via `POST /admin/kyc/{user}/decide`.
     *
     * @return array<string, mixed>|null
     */
    private function director(Establishment $establishment): ?array
    {
        $staff = EstablishmentStaff::where('establishment_id', $establishment->id)
            ->where('role', 'direction')->first();
        if (! $staff) {
            return null;
        }
        $user = User::find($staff->user_id);

        return [
            'user_id' => $staff->user_id,
            'name' => $user?->name,
            'phone' => $user?->phone,
            'kyc_required' => (bool) $staff->kyc_required,
            'kyc_status' => $user?->kyc_status ?? 'none',
        ];
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
