<?php

namespace App\Providers;

use App\Services\Billing\BillingService;
use Illuminate\Support\ServiceProvider;

/**
 * Provider dédié au domaine Billing.
 */
class BillingServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(BillingService::class);
    }
}
