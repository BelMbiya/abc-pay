<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\KycDecisionRequest;
use App\Models\User;
use App\Services\Identity\KycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/** Revue KYC (super-admin) : dossiers en attente, consultation des pièces (flux privé), décision. */
class KycAdminController extends Controller
{
    public function __construct(private readonly KycService $kyc) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        return response()->json(['data' => $this->kyc->list(is_string($status) ? $status : null)]);
    }

    /** Sert une pièce PRIVÉE en flux — accessible au seul administrateur authentifié. */
    public function document(User $user, string $type): StreamedResponse
    {
        abort_unless(in_array($type, ['front', 'back', 'selfie'], true), 404);
        $path = $this->kyc->documentPath($user, $type);
        abort_if(! $path || ! Storage::disk('local')->exists($path), 404);

        return Storage::disk('local')->response($path);
    }

    public function decide(KycDecisionRequest $request, User $user): JsonResponse
    {
        $data = $request->validated();
        $this->kyc->review($user, $data['decision'], $data['reason'] ?? null, $request->user()->email ?? 'admin');

        return response()->json(['data' => $this->kyc->present($user->refresh(), forAdmin: true)]);
    }
}
