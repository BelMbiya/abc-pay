<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLearnerRequest;
use App\Models\Establishment;
use App\Models\Learner;
use App\Services\Academic\LearnerService;
use App\Services\Notification\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD). Établissement = celui du staff authentifié
 * (lié par le middleware `staff`).
 */
class LearnerController extends Controller
{
    public function __construct(
        private readonly LearnerService $learners,
        private readonly NotificationService $notifications,
    ) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->learners->listForEstablishment($this->establishment($request))]);
    }

    public function store(StoreLearnerRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->learners->create($this->establishment($request), $request->validated())], 201);
    }

    /** Relance un apprenant en dette (trace la relance). */
    public function remind(Request $request, Learner $learner): JsonResponse
    {
        // Scope tenant : un staff ne relance que les apprenants de SON établissement.
        if ($learner->establishment_id !== $this->establishment($request)->id) {
            return response()->json(['error' => ['code' => 'forbidden', 'message' => 'Apprenant hors de votre établissement.']], 403);
        }

        $this->notifications->remindLearner($learner);

        return response()->json(['data' => ['status' => 'sent']]);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
