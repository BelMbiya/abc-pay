<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminAuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Journal d'audit des actions administrateur — LECTURE seule, réservé au super-admin
 * (gate `admin.can:audit.view`, permission détenue par le seul rôle super_admin).
 */
class AdminAuditController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = AdminAuditLog::query()
            ->when($request->query('admin_id'), fn ($q, $v) => $q->where('admin_id', $v))
            ->when($request->query('q'), fn ($q, $v) => $q->where(fn ($w) => $w
                ->where('action', 'like', "%{$v}%")
                ->orWhere('admin_name', 'like', "%{$v}%")
                ->orWhere('path', 'like', "%{$v}%")))
            ->orderByDesc('created_at')
            ->limit(300)
            ->get()
            ->map(fn (AdminAuditLog $l) => [
                'id' => $l->id,
                'admin_id' => $l->admin_id,
                'admin_name' => $l->admin_name,
                'admin_role' => $l->admin_role,
                'action' => $l->action,
                'method' => $l->method,
                'path' => $l->path,
                'target_type' => $l->target_type,
                'target_id' => $l->target_id,
                'status' => (int) $l->status,
                'ip' => $l->ip,
                'created_at' => $l->created_at?->toIso8601String(),
            ])->all();

        return response()->json(['data' => ['logs' => $logs]]);
    }
}
