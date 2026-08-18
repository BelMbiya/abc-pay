<?php

/*
 * Sélection de la passerelle d'ENCAISSEMENT active. Le conteneur (AppServiceProvider)
 * résout App\Services\Payment\Gateways\Contracts\PaymentGateway vers l'implémentation
 * nommée ici. Changer de passerelle = changer cette seule valeur.
 *
 * Valeurs : 'cinetpay' (défaut) | 'araka'. Une passerelle sélectionnée mais désactivée
 * (clés absentes / *_ENABLED=false) fait retomber abc pay en mode démo (confirmation mock).
 */
return [
    'default_gateway' => env('PAYMENT_GATEWAY', 'cinetpay'),
];
