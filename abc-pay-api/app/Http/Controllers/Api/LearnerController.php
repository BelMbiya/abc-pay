<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportLearnersRequest;
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

    /** Import / réconciliation en masse par matricule → bilan (créés / réconciliés / erreurs). */
    public function import(ImportLearnersRequest $request): JsonResponse
    {
        // Séparation des tâches (M3) : l'import de masse (réécrit le registre + barème) est réservé à la direction.
        abort_unless($request->attributes->get('staff_role') === 'direction', 403, 'Import réservé à la direction de l\'établissement.');
        $rows = $request->validated()['learners'];

        return response()->json(['data' => $this->learners->import($this->establishment($request), $rows)]);
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

    /** Relevé de compte d'un apprenant (postes dû/payé/solde + historique des paiements). */
    public function statement(Request $request, Learner $learner): JsonResponse
    {
        // Scope tenant : un staff ne consulte que les apprenants de SON établissement.
        if ($learner->establishment_id !== $this->establishment($request)->id) {
            return response()->json(['error' => ['code' => 'forbidden', 'message' => 'Apprenant hors de votre établissement.']], 403);
        }

        return response()->json(['data' => $this->learners->statement($learner)]);
    }

    private function establishment(Request $request): Establishment
    {
        /** @var Establishment $establishment */
        $establishment = $request->attributes->get('establishment');

        return $establishment;
    }
}
