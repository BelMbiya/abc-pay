<?php

/*
 * Passerelle Araka Payments (RDC) — API REST bearer. Auth `/api/login` (email+password →
 * token), encaissement `/api/pay/paymentrequest` (PUSH DIRECT sur le téléphone : provider
 * + walletID, PAS de page web), statut `/api/reporting/transactionstatusbyreference/{ref}`,
 * callback signé HMAC (X-APP-SIGNATURE).
 *
 * `enabled` = OFF par défaut : l'accès API Araka doit d'abord être activé par leur équipe
 * technique (+ un `payment_page_id` créé au portail + clé HMAC). Tant que c'est absent,
 * cette passerelle reste inactive.
 */
return [
    'enabled' => (bool) env('ARAKA_ENABLED', false),

    // UAT (sandbox) par défaut ; en prod, renseigner l'URL fournie par Araka.
    'base_url' => rtrim(env('ARAKA_BASE_URL', 'https://araka-api-uat.azurewebsites.net'), '/'),

    // Identifiants du compte marchand (login API).
    'email' => env('ARAKA_EMAIL'),
    'password' => env('ARAKA_PASSWORD'),

    // Identifiant de la « Payment Page » créée au portail (obligatoire dans chaque requête).
    'payment_page_id' => env('ARAKA_PAYMENT_PAGE_ID'),

    // Sécurité du callback : clé privée partagée (vérif de la signature X-APP-SIGNATURE)
    // et activation du mode HMAC (en-tête X-API-CALLBACK-MODE=2 sur la requête d'origine).
    'hmac_key' => env('ARAKA_HMAC_KEY'),
    'callback_mode' => env('ARAKA_CALLBACK_MODE'), // '2' pour activer HMAC, sinon vide

    'token_ttl' => (int) env('ARAKA_TOKEN_TTL', 3000),

    // Vérification TLS (même bundle CA embarqué que CinetPay sur Windows).
    'ca_bundle' => env('ARAKA_CA_BUNDLE', storage_path('app/cacert.pem')),
    'verify_ssl' => (bool) env('ARAKA_VERIFY_SSL', true),

    // Canal abc pay → fournisseur Araka. Mobile money = channel MOBILEMONEY + provider ;
    // carte = channel CARD (provider ignoré).
    'provider_map' => [
        'mpesa' => 'MPESA',
        'airtel' => 'AIRTEL',
        'orange' => 'ORANGE',
        'africell' => 'AFRIMONEY',
        'visa' => 'CARD',
    ],
];
