<?php

namespace App\Providers;

use App\Services\Identity\Contracts\PhoneTokenVerifier;
use App\Services\Identity\FakePhoneTokenVerifier;
use App\Services\Identity\FirebasePhoneTokenVerifier;
use Illuminate\Support\ServiceProvider;

/**
 * Provider dédié au domaine Identity.
 * Lie l'interface PhoneTokenVerifier à Firebase (si projet configuré) ou au
 * vérificateur de test (dev/CI) — inversion de dépendance (DIP).
 */
class IdentityServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->bind(PhoneTokenVerifier::class, function ($app) {
            $enabled = config('services.firebase.enabled');
            $projectId = config('services.firebase.project_id');

            if ($enabled && $projectId) {
                return new FirebasePhoneTokenVerifier($projectId);
            }

            // SÉCURITÉ (fail-closed) : le vérificateur factice accepte n'importe quel numéro.
            // Il ne doit JAMAIS être actif en production — sinon usurpation totale de compte.
            // Une config Firebase manquante en prod = erreur dure, pas bypass silencieux.
            if ($app->isProduction()) {
                throw new \RuntimeException(
                    'Authentification téléphone non configurée (FIREBASE_ENABLED / FIREBASE_PROJECT_ID) : '.
                    'refus de démarrer avec le vérificateur factice en production.'
                );
            }

            return new FakePhoneTokenVerifier;
        });
    }
}
