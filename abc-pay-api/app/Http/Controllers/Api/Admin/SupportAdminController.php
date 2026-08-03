<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\RespondTicketRequest;
use App\Models\SupportTicket;
use App\Services\Support\SupportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Super-admin — traitement des tickets de support (orchestration seule). */
class SupportAdminController extends Controller
{
    public function __construct(private readonly SupportService $support) {}

    public function index(Request $request): JsonResponse
    {
        $status = $request->query('status');

        return response()->json(['data' => [
            'tickets' => $this->support->listAll(is_string($status) ? $status : null),
            'open' => $this->support->openCount(),
        ]]);
    }

    public function respond(RespondTicketRequest $request, SupportTicket $ticket): JsonResponse
    {
        return response()->json(['data' => $this->support->respond($ticket, $request->validated(), $request->user()?->email ?? 'admin')]);
    }
}
