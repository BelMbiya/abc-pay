<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\FaqSaveRequest;
use App\Models\Faq;
use Illuminate\Http\JsonResponse;

/** Gestion de la FAQ (super-admin) : CRUD des questions/réponses de la landing. */
class FaqAdminController extends Controller
{
    /** Toutes les entrées (publiées ou non), dans l'ordre d'affichage. */
    public function index(): JsonResponse
    {
        return response()->json([
            'data' => Faq::query()->orderBy('position')->orderBy('created_at')->get(),
        ]);
    }

    public function store(FaqSaveRequest $request): JsonResponse
    {
        $faq = Faq::create($request->validated());

        return response()->json(['data' => $faq], 201);
    }

    public function update(FaqSaveRequest $request, Faq $faq): JsonResponse
    {
        $faq->update($request->validated());

        return response()->json(['data' => $faq]);
    }

    public function destroy(Faq $faq): JsonResponse
    {
        $faq->delete();

        return response()->json(['data' => ['deleted' => true]]);
    }
}
