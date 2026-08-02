<?php

namespace App\Providers;

use App\Services\Academic\LearnerService;
use Illuminate\Support\ServiceProvider;

/**
 * Provider dédié au domaine Academic.
 */
class AcademicServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(LearnerService::class);
    }
}
