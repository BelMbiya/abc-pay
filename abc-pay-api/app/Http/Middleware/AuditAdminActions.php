<?php

namespace App\Http\Middleware;

use App\Models\Admin;
use App\Models\AdminAuditLog;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Journalise les ACTIONS mutantes (POST/PATCH/PUT/DELETE) de l'espace /admin dans le
 * journal d'audit. On enregistre APRÈS coup, uniquement si l'admin est authentifié et si
 * la réponse est un succès (< 400). On ne stocke JAMAIS le corps de requête (mots de passe,
 * secrets) — seulement l'action, la ressource visée (params de route) et l'IP.
 */
class AuditAdminActions
{
    private const MUTATING = ['POST', 'PATCH', 'PUT', 'DELETE'];

    /** Routes mutantes à NE PAS journaliser (bruit non pertinent pour l'audit). */
    private const SKIP = ['admin/notifications/read'];

    /** Libellé métier par action de contrôleur (« Controller@method »). */
    private const LABELS = [
        'SettlementAdminController@store' => 'Reversement exécuté',
        'RefundAdminController@store' => 'Remboursement — demande créée',
        'RefundAdminController@decide' => 'Remboursement — décision',
        'EstablishmentAdminController@store' => 'Établissement créé',
        'EstablishmentAdminController@update' => 'Établissement modifié',
        'EstablishmentAdminController@updateLogin' => 'Identifiants établissement modifiés',
        'EstablishmentAdminController@destroy' => 'Établissement supprimé',
        'EstablishmentDocumentAdminController@store' => 'Document KYB ajouté',
        'KycAdminController@decide' => 'Décision KYC',
        'FraudAdminController@dismiss' => 'Alerte fraude ignorée',
        'FraudAdminController@block' => 'Compte bloqué (fraude)',
        'AdminUserController@store' => 'Utilisateur créé',
        'AdminUserController@block' => 'Utilisateur bloqué',
        'AdminUserController@unblock' => 'Utilisateur débloqué',
        'AdminUserController@disconnect' => 'Utilisateur déconnecté',
        'AdminUserController@destroy' => 'Utilisateur supprimé',
        'AdminTeamController@store' => 'Administrateur créé',
        'AdminTeamController@update' => 'Administrateur modifié',
        'AdminTeamController@resetPassword' => "Mot de passe d'un admin réinitialisé",
        'AdminTeamController@destroy' => 'Administrateur supprimé',
        'SettingsController@update' => 'Paramètres plateforme modifiés',
        'SupportAdminController@respond' => 'Réponse à un ticket',
        'LeadAdminController@update' => 'Demande de démo modifiée',
        'LeadAdminController@destroy' => 'Demande de démo supprimée',
        'ReviewAdminController@approve' => 'Avis approuvé',
        'ReviewAdminController@reject' => 'Avis rejeté',
        'FaqAdminController@store' => 'FAQ créée',
        'FaqAdminController@update' => 'FAQ modifiée',
        'FaqAdminController@destroy' => 'FAQ supprimée',
        'AuthController@changeAdminPassword' => 'Mot de passe changé',
        'AuthController@updateAdminProfile' => 'Profil admin modifié',
        'FeeScheduleController@update' => 'Barème modifié',
        'FeeScheduleController@destroy' => 'Barème supprimé',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $method = strtoupper($request->method());
        $admin = $request->user();

        if (in_array($method, self::MUTATING, true)
            && $admin instanceof Admin
            && $response->getStatusCode() < 400
            && ! in_array($request->path(), self::SKIP, true)) {
            $this->record($request, $admin, $method, $response->getStatusCode());
        }

        return $response;
    }

    private function record(Request $request, Admin $admin, string $method, int $status): void
    {
        $route = $request->route();
        $targetType = null;
        $targetId = null;
        $meta = [];

        foreach ($route ? $route->parameters() : [] as $key => $value) {
            $id = is_object($value) ? ($value->id ?? null) : $value;
            if ($id === null || ! is_scalar($id)) {
                continue;
            }
            $meta[$key] = (string) $id;
            if ($targetType === null) {
                $targetType = $key;
                $targetId = (string) $id;
            }
        }

        try {
            AdminAuditLog::create([
                'admin_id' => (string) $admin->id,
                'admin_name' => $admin->name,
                'admin_role' => $admin->role,
                'action' => $this->label($route?->getActionName(), $method, $request->path()),
                'method' => $method,
                'path' => '/'.ltrim($request->path(), '/'),
                'target_type' => $targetType,
                'target_id' => $targetId,
                'meta' => $meta ?: null,
                'ip' => $request->ip(),
                'status' => $status,
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // L'audit ne doit JAMAIS casser la requête métier (best-effort).
        }
    }

    private function label(?string $actionName, string $method, string $path): string
    {
        if ($actionName && str_contains($actionName, '@')) {
            [$controller, $fn] = explode('@', $actionName, 2);
            $short = class_basename($controller).'@'.$fn;
            if (isset(self::LABELS[$short])) {
                return self::LABELS[$short];
            }
        }

        return $method.' /'.$path;
    }
}
