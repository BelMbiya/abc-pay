<?php

use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // En-têtes de sécurité sur toutes les réponses.
        $middleware->append(SecurityHeaders::class);

        // Pile API : toujours du JSON + limitation de débit (anti-bruteforce/DoS).
        $middleware->api(prepend: [
            ForceJsonResponse::class,
        ]);
        $middleware->throttleApi('api');

        // SÉCURITÉ : ne faire confiance qu'aux proxys connus. Faire confiance à « * »
        // laisse spoofer X-Forwarded-For → contournement des rate-limiters (bruteforce)
        // et du gating HSTS. En prod : liste de CIDR via TRUSTED_PROXIES ; en local : « * ».
        $trustedProxies = env('TRUSTED_PROXIES');
        $middleware->trustProxies(at: $trustedProxies
            ? array_map('trim', explode(',', $trustedProxies))
            : (env('APP_ENV') === 'production' ? [] : '*'));

        // Alias d'authentification (module Identity) : payeur (jwt), staff établissement, super-admin.
        $middleware->alias([
            'jwt' => \App\Http\Middleware\JwtAuthenticate::class,
            'staff' => \App\Http\Middleware\StaffAuthenticate::class,
            'admin' => \App\Http\Middleware\AdminAuthenticate::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );
    })->create();
