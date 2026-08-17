<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ReviewStoreRequest;
use App\Models\Review;
use App\Services\Platform\SettingsService;
use Illuminate\Http\JsonResponse;

/**
 * Avis : dépôt par un payeur (jwt) ou un établissement (staff), lecture publique
 * (approuvés) pour la section « témoignages » de la landing. Modération en admin.
 */
class ReviewController extends Controller
{
    /** Déposer un avis (statut « pending » → modéré avant publication). */
    public function store(ReviewStoreRequest $request): JsonResponse
    {
        $isStaff = $request->is('api/v1/staff/*');
        $user = $request->user();

        $review = Review::create([
            'author_type' => $isStaff ? 'staff' : 'user',
            'author_id' => $user->id,
            'author_name' => $user->name ?: ($isStaff ? 'Établissement partenaire' : 'Utilisateur abc pay'),
            'author_role' => $request->validated('author_role') ?: ($isStaff ? 'Direction' : null),
            'context' => $request->validated('context'),
            'rating' => (int) $request->validated('rating'),
            'message' => $request->validated('message'),
            'status' => 'pending',
        ]);

        return response()->json(['data' => ['id' => $review->id, 'status' => $review->status]], 201);
    }

    /** Avis APPROUVÉS, exposés publiquement (landing) — nb plafonné par réglage admin. */
    public function publicIndex(SettingsService $settings): JsonResponse
    {
        $reviews = Review::where('status', 'approved')->latest()->limit($settings->reviewsLimit())
            ->get(['author_name', 'author_role', 'context', 'rating', 'message', 'created_at']);

        return response()->json(['data' => $reviews]);
    }
}
