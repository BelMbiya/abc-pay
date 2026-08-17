<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Autorisation par PERMISSION pour les routes admin. À placer APRÈS `admin`
 * (qui authentifie et résout l'Admin). Usage : ->middleware('admin.can:refunds.manage').
 */
class AdminPermission
{
    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $admin = $request->user();
        if (! $admin instanceof Admin || ! $admin->hasPermission($permission)) {
            return response()->json([
                'error' => ['code' => 'forbidden', 'message' => 'Permission insuffisante pour cette action.'],
            ], 403);
        }

        return $next($request);
    }
}
