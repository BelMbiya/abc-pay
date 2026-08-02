<?php

use App\Providers\AcademicServiceProvider;
use App\Providers\AppServiceProvider;
use App\Providers\BillingServiceProvider;
use App\Providers\IdentityServiceProvider;
use App\Providers\NotificationServiceProvider;
use App\Providers\PaymentServiceProvider;
use App\Providers\TenancyServiceProvider;

return [
    AcademicServiceProvider::class,
    AppServiceProvider::class,
    BillingServiceProvider::class,
    IdentityServiceProvider::class,
    NotificationServiceProvider::class,
    PaymentServiceProvider::class,
    TenancyServiceProvider::class,
];
