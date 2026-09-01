<?php

use App\Http\Middleware\ForceJsonResponse;
use App\Http\Middleware\SecurityHeaders;
use App\Services\Notification\AdminNotificationService;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

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
            'admin.can' => \App\Http\Middleware\AdminPermission::class,
            'audit.admin' => \App\Http\Middleware\AuditAdminActions::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*'),
        );

        // Enveloppe uniforme pour les ValidationException levées HORS FormRequest
        // (règles métier dans un service) → même format `error.code=validation_failed`
        // que SecureFormRequest, pour un contrat d'API cohérent.
        $exceptions->render(function (ValidationException $e, Request $request) {
            if ($request->is('api/*')) {
                return response()->json([
                    'error' => [
                        'code' => 'validation_failed',
                        'message' => 'Certains champs sont invalides.',
                        'fields' => $e->errors(),
                    ],
                ], 422);
            }

            return null;
        });

        // Filet de sécurité : toute exception NON gérée sur une route api/* doit renvoyer
        // une enveloppe uniforme `error.code=server_error` — jamais un message brut ni une
        // stack trace (fuite d'info). Le détail complet reste tracé dans les logs (report()
        // par défaut). Les erreurs HTTP « normales » (404/403/401, validation) gardent leur
        // propre rendu → on les laisse passer.
        $exceptions->render(function (Throwable $e, Request $request) {
            if (! $request->is('api/*')
                || $e instanceof HttpExceptionInterface
                || $e instanceof AuthenticationException
                || $e instanceof ValidationException) {
                return null;
            }

            // Identifiant de corrélation : court, non technique, affiché à l'utilisateur
            // ET écrit dans les logs. Il permet de retrouver INSTANTANÉMENT l'erreur
            // (type, source, auteur) à partir de la référence citée par l'utilisateur —
            // sans jamais exposer la technique côté client.
            $traceId = strtoupper(Str::random(10));
            $source = $e->getFile().':'.$e->getLine();

            // Log structuré : TYPE (classe), SOURCE (fichier:ligne), route, AUTEUR (user),
            // message. Grep par `trace_id` → on tombe direct sur l'origine.
            Log::error('[api] '.class_basename($e).' — réf '.$traceId, [
                'trace_id' => $traceId,
                'type' => $e::class,
                'source' => $source,
                'route' => $request->method().' '.$request->path(),
                'user_id' => optional($request->user())->id,
                'message' => $e->getMessage(),
            ]);

            // Alerte le fil admin (best-effort — ne jamais masquer l'erreur d'origine).
            try {
                app(AdminNotificationService::class)->push(
                    type: 'system',
                    level: 'critical',
                    title: 'Erreur serveur (réf. '.$traceId.')',
                    body: class_basename($e).' sur '.$request->method().' '.$request->path(),
                    meta: ['trace_id' => $traceId, 'path' => $request->path(), 'exception' => $e::class, 'source' => $source, 'user_id' => optional($request->user())->id],
                );
            } catch (\Throwable) {
                // silencieux : l'infrastructure de notif ne doit pas aggraver l'incident.
            }

            return response()->json([
                'error' => [
                    'code' => 'server_error',
                    'message' => 'Une erreur interne est survenue (réf. '.$traceId.'). Réessaie, ou contacte le support en citant cette référence.',
                    'trace_id' => $traceId,
                    // Détail visible uniquement en développement (APP_DEBUG), jamais en prod.
                    ...(config('app.debug') ? ['debug' => $e->getMessage(), 'source' => $source] : []),
                ],
            ], 500);
        });
    })->create();
