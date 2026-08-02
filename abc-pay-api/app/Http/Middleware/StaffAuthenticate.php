<?php

namespace App\Http\Middleware;

use App\Models\Establishment;
use App\Models\User;
use App\Services\Identity\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Authentifie le personnel d'établissement via un JWT de portée « staff ».
 * Lie l'établissement du jeton à la requête (scoping multi-tenant) : les
 * contrôleurs n'agissent que sur l'établissement du staff connecté.
 */
class StaffAuthenticate
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

        if (($claims['type'] ?? null) !== 'access' || ($claims['scope'] ?? null) !== 'staff') {
            return $this->unauthorized();
        }

        $user = User::find($claims['sub'] ?? null);
        $establishment = Establishment::find($claims['establishment_id'] ?? null);
        if (! $user || ! $establishment) {
            return $this->unauthorized();
        }

        $request->setUserResolver(fn () => $user);
        $request->attributes->set('establishment', $establishment);
        $request->attributes->set('staff_role', $claims['role'] ?? null);

        return $next($request);
    }

    private function unauthorized(): Response
    {
        return response()->json([
            'error' => ['code' => 'unauthenticated', 'message' => 'Authentification établissement requise.'],
        ], 401);
    }
}
