<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    // Firebase : vérification des jetons d'authentification téléphone (OTP côté client).
    // Le vérificateur RÉEL n'est actif que si enabled=true ET project_id présent.
    // Sinon (défaut) → vérificateur de test (fake) qui accepte les jetons `fake:+243…`.
    // À activer (enabled=true) une fois le provider "Phone" configuré dans la console.
    'firebase' => [
        'enabled' => filter_var(env('FIREBASE_ENABLED', false), FILTER_VALIDATE_BOOL),
        'project_id' => env('FIREBASE_PROJECT_ID'),
    ],

];
