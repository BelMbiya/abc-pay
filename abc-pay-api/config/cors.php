<?php

/**
 * CORS strict pour abc pay (fintech).
 * Aucun wildcard d'origine : seules les origines abc pay déclarées via
 * l'env CORS_ALLOWED_ORIGINS (séparées par des virgules) sont autorisées.
 * Réf : docs/SECURITY.md §2.
 */
return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    'allowed_origins' => array_values(array_filter(
        explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000'))
    )),

    // Jamais de pattern d'origine large.
    'allowed_origins_patterns' => [],

    // Autoriser seulement les en-têtes nécessaires (pas de '*').
    'allowed_headers' => [
        'Accept',
        'Authorization',
        'Content-Type',
        'X-Requested-With',
        'X-XSRF-TOKEN',
        'Idempotency-Key',
    ],

    'exposed_headers' => [],

    'max_age' => 600,

    // Cookies de session Sanctum autorisés (SPA de confiance uniquement).
    'supports_credentials' => true,
];
