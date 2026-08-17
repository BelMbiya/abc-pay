<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // --- Robustesse ORM (sécurité + intégrité) -----------------------
        // Erreur si un attribut non déclaré dans #[Fillable] est assigné,
        // si un attribut manquant est accédé, et interdiction du lazy-loading.
        Model::shouldBeStrict(! $this->app->isProduction());
        // Ne JAMAIS déprotéger globalement le mass-assignment.
        Model::preventSilentlyDiscardingAttributes();

        // --- HTTPS forcé en production -----------------------------------
        if ($this->app->isProduction()) {
            URL::forceScheme('https');
        }

        // --- Rate limiters (docs/SECURITY.md §2) -------------------------
        // Débit général de l'API (par utilisateur authentifié, sinon par IP).
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(60)
            ->by($request->user()?->id ?: $request->ip()));

        // Authentification : anti-bruteforce (OTP / login) — sévère, par IP.
        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(5)
            ->by($request->ip()));

        // Paiement : limite les tentatives de paiement par utilisateur.
        RateLimiter::for('payment', fn (Request $request) => Limit::perMinute(10)
            ->by($request->user()?->id ?: $request->ip()));

        // Webhooks opérateurs : débit élevé mais borné (par IP source).
        RateLimiter::for('webhook', fn (Request $request) => Limit::perMinute(300)
            ->by($request->ip()));

        // Vérification de reçu : borne l'énumération de jetons/codes (par IP).
        RateLimiter::for('verify', fn (Request $request) => Limit::perMinute(20)
            ->by($request->ip()));

        // Demandes de démo / partenariat (landing) : anti-spam, par IP.
        // 20/min : borne le spam sans pénaliser les IP partagées (NAT opérateur,
        // cybercafés) fréquentes en RDC, où plusieurs visiteurs légitimes sortent
        // sur une même adresse.
        RateLimiter::for('lead', fn (Request $request) => Limit::perMinute(20)
            ->by($request->ip()));
    }
}
