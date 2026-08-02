<?php

namespace App\Http\Middleware;

use App\Models\User;
use App\Services\Identity\JwtService;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

/**
 * Authentifie la requête via un JWT applicatif (RS256).
 * Vérification stateless (clé publique) → prête pour l'extraction en services.
 */
class JwtAuthenticate
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

        if (($claims['type'] ?? null) !== 'access') {
            return $this->unauthorized();
        }

        // SÉCURITÉ : épingler le scope payeur. Sans ça, un jeton staff/admin (dont le `sub`
        // est un id entier pouvant coïncider avec un id utilisateur) résoudrait vers un
        // AUTRE compte via User::find() → confusion de sujet. On refuse tout scope ≠ payer.
        if (($claims['scope'] ?? null) !== 'payer') {
            return $this->unauthorized();
        }

        $user = User::find($claims['sub'] ?? null);
        if (! $user) {
            return $this->unauthorized();
        }

        // Déconnexion forcée : tout jeton émis avant la révocation est refusé (appareil perdu / usurpation).
        $revokedAt = $user->sessions_revoked_at?->timestamp;
        if ($revokedAt && (int) ($claims['iat'] ?? 0) < $revokedAt) {
            return $this->unauthorized('Session expirée. Reconnecte-toi.');
        }

        // Compte bloqué (fraude / sécurité) : accès gelé, message explicite.
        if ($user->is_blocked) {
            return response()->json([
                'error' => ['code' => 'account_blocked', 'message' => $user->blocked_reason ?: 'Compte bloqué. Contacte le support.'],
            ], 403);
        }

        $request->setUserResolver(fn () => $user);

        return $next($request);
    }

    private function unauthorized(string $message = 'Authentification requise.'): Response
    {
        return response()->json([
            'error' => ['code' => 'unauthenticated', 'message' => $message],
        ], 401);
    }
}
