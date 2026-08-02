<?php

/**
 * JWT applicatif (RS256) — émis par le module Identity.
 * Asymétrique : les futurs services valident via la clé PUBLIQUE, sans appeler
 * Identity (auth découplée, prête pour l'extraction). Clés dans storage/app/keys
 * (générées hors dépôt) ou via env.
 */

$keyFile = function (string $name) {
    $path = storage_path("app/keys/{$name}");

    return is_file($path) ? (string) file_get_contents($path) : null;
};

return [
    'algo' => env('JWT_ALGO', 'RS256'),
    'private_key' => env('JWT_PRIVATE_KEY') ?: $keyFile('jwt_private.pem'),
    'public_key' => env('JWT_PUBLIC_KEY') ?: $keyFile('jwt_public.pem'),
    'issuer' => env('JWT_ISSUER', 'abcpay'),
    'access_ttl' => (int) env('JWT_ACCESS_TTL', 900),        // 15 min
    'refresh_ttl' => (int) env('JWT_REFRESH_TTL', 2592000),  // 30 jours
];
