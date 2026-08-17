<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Notification\AdminNotificationService;
use Illuminate\Http\JsonResponse;

/**
 * Fil de notifications opérationnelles du super-admin (fraude / support / système).
 * Orchestration seule : la logique est dans {@see AdminNotificationService}.
 */
class AdminNotificationController extends Controller
{
    public function __construct(private readonly AdminNotificationService $notifications) {}

    public function index(): JsonResponse
    {
        return response()->json(['data' => [
            'notifications' => $this->notifications->latest(),
            'unread' => $this->notifications->unreadCount(),
        ]]);
    }

    public function read(): JsonResponse
    {
        $this->notifications->markAllRead();

        return response()->json(['data' => ['ok' => true]]);
    }
}
