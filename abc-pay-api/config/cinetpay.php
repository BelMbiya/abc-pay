<?php

/*
 * Passerelle CinetPay — API « Aurore » (RDC). Auth UNIFIÉE (api_key + api_password →
 * access_token Bearer), base unique https://api.cinetpay.net/v1, pour l'encaissement
 * (/payment) ET le reversement (/transfer). CDF supporté.
 *
 * `enabled` = OFF par défaut : sans clés, abc pay reste en mode démo (confirmation
 * immédiate, aucun appel externe). En production, renseigner les clés + CINETPAY_ENABLED=true.
 */
return [
    'enabled' => (bool) env('CINETPAY_ENABLED', false),

    // Identifiants d'API (page « API & sécurité » du panel CinetPay).
    'api_key' => env('CINETPAY_API_KEY'),
    'api_password' => env('CINETPAY_API_PASSWORD'),

    // Base unique de l'API Aurore.
    'base_url' => rtrim(env('CINETPAY_BASE_URL', 'https://api.cinetpay.net/v1'), '/'),

    // Méthodes par défaut (optionnelles) — codes opérateurs (voir « Méthodes de paiement »).
    'default_payment_method' => env('CINETPAY_PAYMENT_METHOD'),
    'default_transfer_method' => env('CINETPAY_TRANSFER_METHOD'),

    // REVERSEMENT AUTOMATIQUE (payout via CinetPay Transfer). INDÉPENDANT de l'encaissement :
    // l'API Transfer exige une activation séparée + un solde approvisionné. OFF par défaut →
    // le reversement est un acte comptable (marqué « payé » + notifié), le mouvement d'argent
    // étant fait hors-bande. ON → transfert RÉEL (exige `payout_phone` sur l'établissement).
    'transfer_enabled' => (bool) env('CINETPAY_TRANSFER_ENABLED', false),

    // Correspondance canal abc pay → code opérateur CinetPay. VERROUILLE l'opérateur sur
    // la page CinetPay pour qu'il corresponde au canal choisi par le payeur (sinon
    // l'utilisateur peut choisir un opérateur ≠ de son numéro → échec garanti). Codes RDC
    // (suffixe _CD) par défaut ; surchargez si le compte couvre un autre pays.
    'method_map' => [
        'mpesa' => env('CINETPAY_METHOD_MPESA', 'MPESA_CD'),
        'airtel' => env('CINETPAY_METHOD_AIRTEL', 'AIRTEL_CD'),
        'orange' => env('CINETPAY_METHOD_ORANGE', 'OM_CD'),
        'africell' => env('CINETPAY_METHOD_AFRICELL', 'AFRICELL_CD'),
        'visa' => env('CINETPAY_METHOD_VISA', 'VISA_CD'),
    ],

    // Base publique HTTPS pour les webhooks (notify_url). `?:` → si la var est VIDE,
    // on retombe sur APP_URL (sinon notify_url serait relatif/invalide et CinetPay
    // n'émettrait pas de payment_url).
    'notify_base' => rtrim(env('CINETPAY_NOTIFY_BASE') ?: env('APP_URL', 'http://localhost:8000'), '/'),
    // Origine du front (success_url / failed_url).
    'front_url' => rtrim(env('CINETPAY_FRONT_URL') ?: env('APP_URL', 'http://localhost:3000'), '/'),

    // TTL du cache du jeton (expires_in = 86400 s ; on garde une marge).
    'token_ttl' => (int) env('CINETPAY_TOKEN_TTL', 82800),

    // Montant MINIMUM accepté par CinetPay (mobile money). En dessous, CinetPay renvoie un
    // « 2010 FAILED / Paiement échoué » OPAQUE. On garde-fou AVANT l'appel avec un message
    // clair. Sandbox USD M-Pesa CD : ~100. 0 = pas de garde-fou. (Dépend devise/opérateur.)
    'min_amount' => (int) env('CINETPAY_MIN_AMOUNT', 0),

    // Proxy sortant OPTIONNEL pour les appels CinetPay. En le pointant vers un proxy à
    // IP FIXE (whitelistée une fois), on élimine le « This Ip is not withlisted » causé par
    // une IP publique dynamique en dev. Ex. CINETPAY_HTTP_PROXY=http://user:pass@ip:port
    'http_proxy' => env('CINETPAY_HTTP_PROXY'),

    // Vérification TLS. On pointe vers un bundle CA embarqué (corrige « cURL error 60 »
    // sur les PHP mal configurés) ; sinon vérification système. `CINETPAY_VERIFY_SSL=false`
    // est un repli DEV UNIQUEMENT (jamais en prod — MITM).
    'ca_bundle' => env('CINETPAY_CA_BUNDLE', storage_path('app/cacert.pem')),
    'verify_ssl' => (bool) env('CINETPAY_VERIFY_SSL', true),
];
