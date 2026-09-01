<?php

namespace App\Services\Identity;

/**
 * RBAC des comptes SYSTÈME (administrateurs de la plateforme).
 * Catalogue de permissions + carte rôle → permissions. `super_admin` a tout (« * »).
 * Source unique de vérité, partagée par le middleware, l'API et le front (exposé au login).
 */
final class AdminRbac
{
    /** Permissions atomiques, groupées par domaine du back-office admin. */
    public const PERMISSIONS = [
        'dashboard.view',        // vue d'ensemble
        'transactions.view',     // consulter les transactions
        'refunds.manage',        // décider des remboursements
        'commissions.manage',    // commissions / reversements
        'establishments.manage', // établissements (créer, suspendre, config, login)
        'users.manage',          // comptes utilisateurs (bloquer, déconnecter…)
        'kyc.review',            // vérification d'identité
        'fraud.manage',          // signalements de fraude
        'reviews.moderate',      // modération des avis
        'faq.manage',            // FAQ
        'leads.manage',          // demandes de démo
        'support.manage',        // litiges / support
        'settings.manage',       // réglages plateforme
        'admins.manage',         // gérer l'équipe d'administrateurs (sensible)
        'audit.view',            // journal d'audit des actions admin (super-admin seul)
    ];

    /** Rôles → permissions. « * » = toutes. */
    private const ROLES = [
        'super_admin' => ['*'],
        'finance' => ['dashboard.view', 'transactions.view', 'refunds.manage', 'commissions.manage'],
        'compliance' => ['dashboard.view', 'transactions.view', 'kyc.review', 'fraud.manage', 'users.manage'],
        'support' => ['dashboard.view', 'leads.manage', 'support.manage', 'reviews.moderate', 'faq.manage'],
        'readonly' => ['dashboard.view', 'transactions.view'],
    ];

    /** Libellés des rôles (UI). */
    public const ROLE_LABELS = [
        'super_admin' => 'Super administrateur',
        'finance' => 'Finance',
        'compliance' => 'Conformité',
        'support' => 'Support',
        'readonly' => 'Lecture seule',
    ];

    /** @return list<string> rôles assignables */
    public static function roles(): array
    {
        return array_keys(self::ROLES);
    }

    /** @return list<string> permissions effectives d'un rôle (résolues, « * » développé) */
    public static function permissionsFor(?string $role): array
    {
        $perms = self::ROLES[$role] ?? [];

        return $perms === ['*'] ? self::PERMISSIONS : array_values($perms);
    }

    /** Le rôle possède-t-il la permission ? */
    public static function can(?string $role, string $permission): bool
    {
        $perms = self::ROLES[$role] ?? [];

        return $perms === ['*'] || in_array($permission, $perms, true);
    }
}
