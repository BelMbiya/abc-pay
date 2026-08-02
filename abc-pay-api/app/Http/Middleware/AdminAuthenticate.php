<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Services\Identity\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Authentifie un super-admin abc pay via un JWT de portée « admin ».
 * Protège les endpoints /admin/* (onboarding établissements, etc.).
 */
class AdminAuthenticate
{
    public function __construct(private readonly JwtService $jwt) {}

    public function handle(Request $request, Closure $next): Response
    {
        $token = $request->bearerToken();
        if (! $token) {
            return $this->unauthorized();
        }

        try {
            $claims = $this->jwt->parse($token);
        } catch (Throwable) {
            return $this->unauthorized();
        }

        if (($claims['type'] ?? null) !== 'access' || ($claims['scope'] ?? null) !== 'admin') {
            return $this->unauthorized();
        }

        $admin = Admin::find($claims['sub'] ?? null);
        if (! $admin || ! $admin->is_active) {
            return $this->unauthorized();
        }

        $request->setUserResolver(fn () => $admin);
        $request->attributes->set('admin_role', $claims['role'] ?? null);

        return $next($request);
    }

    private function unauthorized(): Response
    {
        return response()->json([
            'error' => ['code' => 'unauthenticated', 'message' => 'Authentification administrateur requise.'],
        ], 401);
    }
}
