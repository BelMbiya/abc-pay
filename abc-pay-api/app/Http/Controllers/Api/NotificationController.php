<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Notification\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Centre de notifications du payeur (JWT). */
class NotificationController extends Controller
{
    public function __construct(private readonly NotificationService $notifications) {}

    public function index(Request $request): JsonResponse
    {
        $id = $request->user()->id;

        return response()->json(['data' => [
            'notifications' => $this->notifications->listFor($id),
            'unread' => $this->notifications->unreadCount($id),
        ]]);
    }

    public function read(Request $request): JsonResponse
    {
        $this->notifications->markAllRead($request->user()->id);

        return response()->json(['data' => ['unread' => 0]]);
    }
}
