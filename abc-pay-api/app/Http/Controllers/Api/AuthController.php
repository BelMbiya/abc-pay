<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminLoginRequest;
use App\Http\Requests\FirebaseAuthRequest;
use App\Http\Requests\RefreshTokenRequest;
use App\Http\Requests\StaffLoginRequest;
use App\Http\Requests\UpdateAdminProfileRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Services\Identity\AdminAuthService;
use App\Services\Identity\AuthService;
use App\Services\Identity\Exceptions\AccountBlockedException;
use App\Services\Identity\Exceptions\AccountNotFoundException;
use App\Services\Identity\Exceptions\EmailAlreadyUsedException;
use App\Services\Identity\Exceptions\InvalidCredentialsException;
use App\Services\Identity\Exceptions\InvalidPhoneTokenException;
use App\Services\Identity\Exceptions\InvalidRefreshTokenException;
use App\Services\Identity\RefreshService;
use App\Services\Identity\StaffAuthService;
use App\Services\Identity\UserProfileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Orchestration seule (DDD) : validation → service → réponse.
 */
class AuthController extends Controller
{
    public function __construct(
        private readonly AuthService $auth,
        private readonly StaffAuthService $staffAuth,
        private readonly AdminAuthService $adminAuth,
        private readonly RefreshService $refresh,
        private readonly UserProfileService $profiles,
    ) {}

    /** Renouvelle un jeton d'accès (payer / staff / admin) à partir d'un refresh token. */
    public function refresh(RefreshTokenRequest $request): JsonResponse
    {
        try {
            $data = $this->refresh->refresh($request->validated('refresh_token'));
        } catch (InvalidRefreshTokenException $e) {
            return response()->json([
                'error' => ['code' => 'invalid_refresh', 'message' => 'Session expirée. Reconnecte-toi.'],
            ], 401);
        }

        return response()->json(['data' => $data]);
    }

    /** Met à jour le profil de l'admin authentifié (nom, email, mot de passe). */
    public function updateAdminProfile(UpdateAdminProfileRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->adminAuth->updateProfile($request->user(), $request->validated())]);
    }

    /** Rôle + permissions effectives de l'admin connecté (le front gate l'UI en conséquence). */
    public function adminPermissions(Request $request): JsonResponse
    {
        $admin = $request->user();

        return response()->json(['data' => [
            'role' => $admin->role,
            'permissions' => $admin->permissions(),
            'must_change_password' => (bool) $admin->must_change_password,
        ]]);
    }

    /** Changement de mot de passe admin (lève le gate `must_change_password`). */
    public function changeAdminPassword(\App\Http\Requests\AdminPasswordRequest $request): JsonResponse
    {
        $admin = $request->user();
        $data = $request->validated();

        if (! $admin->password || ! \Illuminate\Support\Facades\Hash::check($data['current_password'], $admin->password)) {
            throw \Illuminate\Validation\ValidationException::withMessages(['current_password' => 'Mot de passe actuel incorrect.']);
        }
        $admin->forceFill(['password' => $data['new_password'], 'must_change_password' => false])->save();

        return response()->json(['data' => ['status' => 'changed']]);
    }

    /** Connexion super-admin abc pay (email + mot de passe) → JWT admin. */
    public function adminLogin(AdminLoginRequest $request): JsonResponse
    {
        try {
            $data = $this->adminAuth->login($request->validated('email'), $request->validated('password'));
        } catch (AccountBlockedException $e) {
            // Compte désactivé/bloqué (litige) : motif CLAIR, pas « identifiants invalides ».
            return response()->json([
                'error' => ['code' => 'account_blocked', 'message' => $e->getMessage()],
            ], 403);
        } catch (InvalidCredentialsException $e) {
            return response()->json([
                'error' => ['code' => 'invalid_credentials', 'message' => 'Identifiants invalides.'],
            ], 422);
        }

        return response()->json(['data' => $data]);
    }

    /** Connexion du personnel d'établissement (email + mot de passe) → JWT staff. */
    public function staffLogin(StaffLoginRequest $request): JsonResponse
    {
        try {
            $data = $this->staffAuth->login($request->validated('email'), $request->validated('password'));
        } catch (AccountBlockedException $e) {
            // Compte bloqué (litige) / établissement suspendu : motif CLAIR.
            return response()->json([
                'error' => ['code' => 'account_blocked', 'message' => $e->getMessage()],
            ], 403);
        } catch (InvalidCredentialsException $e) {
            return response()->json([
                'error' => ['code' => 'invalid_credentials', 'message' => 'Identifiants invalides.'],
            ], 422);
        }

        return response()->json(['data' => $data]);
    }

    /** Connexion par jeton téléphone Firebase → JWT applicatif. */
    public function firebase(FirebaseAuthRequest $request): JsonResponse
    {
        try {
            $data = $this->auth->loginWithPhoneToken(
                $request->validated('firebase_id_token'),
                $request->validated('intent') ?? 'login',
                $request->validated('profile') ?? [],
            );
        } catch (InvalidPhoneTokenException $e) {
            return response()->json([
                'error' => ['code' => 'invalid_token', 'message' => 'Jeton d\'authentification invalide.'],
            ], 422);
        } catch (AccountNotFoundException $e) {
            return response()->json([
                'error' => ['code' => 'account_not_found', 'message' => 'Aucun compte n\'existe pour ce numéro. Crée ton compte.'],
            ], 404);
        } catch (EmailAlreadyUsedException $e) {
            return response()->json([
                'error' => ['code' => 'email_taken', 'message' => 'Un compte existe déjà avec cet e-mail. Connecte-toi, ou inscris-toi avec une autre adresse.'],
            ], 422);
        } catch (AccountBlockedException $e) {
            return response()->json([
                'error' => ['code' => 'account_blocked', 'message' => 'Ce compte est bloqué. Contacte le support.'],
            ], 403);
        }

        return response()->json(['data' => $data]);
    }

    /** Profil de l'utilisateur authentifié (JWT requis). */
    public function me(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->profiles->present($request->user())]);
    }

    /** Met à jour le profil / KYC (identité) de l'utilisateur authentifié. */
    public function updateProfile(UpdateProfileRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->profiles->update($request->user(), $request->validated())]);
    }
}
