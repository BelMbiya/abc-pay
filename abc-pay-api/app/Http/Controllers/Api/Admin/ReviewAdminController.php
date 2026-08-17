<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Modération des avis (super-admin) : approuver → publié sur la landing, ou rejeter. */
class ReviewAdminController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Review::query()->latest()->limit(300)->get()]);
    }

    public function approve(Review $review, Request $request): JsonResponse
    {
        $review->update(['status' => 'approved', 'moderated_by' => $request->user()->email ?? 'admin']);

        return response()->json(['data' => $review]);
    }

    public function reject(Review $review, Request $request): JsonResponse
    {
        $review->update(['status' => 'rejected', 'moderated_by' => $request->user()->email ?? 'admin']);

        return response()->json(['data' => $review]);
    }
}
