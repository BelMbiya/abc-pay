<?php

namespace App\Providers;

use App\Services\Tenancy\EstablishmentDirectory;
use Illuminate\Support\ServiceProvider;

/**
 * Provider dédié au domaine Tenancy (établissements).
 */
class TenancyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(EstablishmentDirectory::class);
    }
}
