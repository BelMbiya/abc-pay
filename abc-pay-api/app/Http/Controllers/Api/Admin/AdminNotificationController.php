<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Notification\AdminNotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Fil de notifications opérationnelles admin (fraude / support / système). Le fil est
 * partagé par l'équipe, mais l'état « lu » est PROPRE à chaque administrateur connecté.
 */
class AdminNotificationController extends Controller
{
    public function __construct(private readonly AdminNotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $adminId = (string) $request->user()->id;

        return response()->json(['data' => [
            'notifications' => $this->notifications->latest($adminId),
            'unread' => $this->notifications->unreadCount($adminId),
        ]]);
    }

    public function read(Request $request): JsonResponse
    {
        $this->notifications->markAllRead((string) $request->user()->id);

        return response()->json(['data' => ['ok' => true]]);
    }
}
