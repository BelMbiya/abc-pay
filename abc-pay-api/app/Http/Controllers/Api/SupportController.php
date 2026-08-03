<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\OpenTicketRequest;
use App\Services\Support\SupportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Support côté payeur (orchestration seule) : ouvrir un ticket, lister les siens,
 * et geler son propre compte (« Bloquer mon compte »).
 */
class SupportController extends Controller
{
    public function __construct(private readonly SupportService $support) {}

    public function index(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->support->listForUser($request->user())]);
    }

    public function store(OpenTicketRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->support->open($request->user(), $request->validated())], 201);
    }

    /** « Bloquer mon compte » : gel immédiat (blocage + révocation de sessions) + ticket urgent. */
    public function lock(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->support->panic($request->user())], 201);
    }
}
