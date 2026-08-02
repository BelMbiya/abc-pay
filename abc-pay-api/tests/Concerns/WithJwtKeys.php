<?php

namespace Tests\Concerns;

/**
 * Charge une paire de clés RSA de TEST (fixtures) dans la config JWT.
 * Clés jetables réservées aux tests — jamais utilisées en production
 * (la prod lit storage/app/keys ou l'env). Portable (pas de openssl_pkey_new,
 * indisponible sur certains environnements Windows).
 */
trait WithJwtKeys
{
    protected function configureJwtKeys(): void
    {
        $dir = base_path('tests/fixtures');

        config([
            'jwt.algo' => 'RS256',
            'jwt.private_key' => (string) file_get_contents("{$dir}/jwt_test_private.pem"),
            'jwt.public_key' => (string) file_get_contents("{$dir}/jwt_test_public.pem"),
            'jwt.issuer' => 'abcpay-test',
            'jwt.access_ttl' => 900,
            'jwt.refresh_ttl' => 2592000,
        ]);
    }
}
