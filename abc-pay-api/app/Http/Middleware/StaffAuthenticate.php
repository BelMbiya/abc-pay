<?php

namespace App\Http\Middleware;

use App\Models\Establishment;
use App\Models\EstablishmentStaff;
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

        // SÉCURITÉ : accès gelé si l'établissement est suspendu ou le compte bloqué.
        if (! $establishment->is_active || $user->is_blocked) {
            return response()->json([
                'error' => ['code' => 'establishment_suspended', 'message' => 'Établissement suspendu ou compte bloqué. Contacte abc pay.'],
            ], 403);
        }

        $request->setUserResolver(fn () => $user);
        $request->attributes->set('establishment', $establishment);
        $request->attributes->set('staff_role', $claims['role'] ?? null);

        // GATE KYC : un compte marqué « vérification requise » (créé après la mise en place)
        // ne peut accéder à l'espace / agir tant que son identité n'est pas APPROUVÉE.
        // Seul l'écran de vérification (/staff/kyc) reste accessible pour se mettre en règle.
        // GATE 1 — mot de passe : à la 1re connexion (ou après reset admin), le compte ne peut
        // RIEN faire d'autre que changer son mot de passe.
        if ($user->must_change_password && $request->path() !== 'api/v1/staff/password') {
            return response()->json([
                'error' => ['code' => 'must_change_password', 'message' => 'Vous devez changer votre mot de passe avant de continuer.'],
            ], 403);
        }

        // GATE 2 — KYC. Allowlist EXACTE des seules routes accessibles à un compte non vérifié
        // (L1 : éviter un match large `api/*/staff/kyc` qui ouvrirait toute future route similaire).
        $kycRoutes = ['api/v1/staff/kyc'];
        $staff = EstablishmentStaff::where('user_id', $user->id)->where('establishment_id', $establishment->id)->first();
        if ($staff && $staff->kyc_required && $user->kyc_status !== 'approved' && ! in_array($request->path(), $kycRoutes, true)) {
            return response()->json([
                'error' => ['code' => 'kyc_required', 'message' => 'Vérification d\'identité requise pour accéder à votre espace.', 'kyc_status' => $user->kyc_status ?? 'none'],
            ], 403);
        }

        return $next($request);
    }

    private function unauthorized(): Response
    {
        return response()->json([
            'error' => ['code' => 'unauthenticated', 'message' => 'Authentification établissement requise.'],
        ], 401);
    }
}
