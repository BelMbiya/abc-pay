<?php

namespace App\Providers;

use App\Services\Document\ReceiptService;
use App\Services\Payment\TuitionPaymentService;
use Illuminate\Support\ServiceProvider;

/**
 * Provider dédié au domaine Paiement (DDD).
 * Enregistre les services métier dans le Service Container ; ils sont injectés
 * par constructeur dans les contrôleurs. Point d'accroche futur pour lier
 * l'interface PaymentGateway à son driver (agrégateur / opérateur).
 */
class PaymentServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(ReceiptService::class);
        $this->app->singleton(TuitionPaymentService::class);
    }
}
