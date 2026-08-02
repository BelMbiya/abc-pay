<?php

namespace App\Providers;

use App\Services\Notification\NotificationService;
use Illuminate\Support\ServiceProvider;

/**
 * Provider dédié au domaine Notification.
 */
class NotificationServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(NotificationService::class);
    }
}
