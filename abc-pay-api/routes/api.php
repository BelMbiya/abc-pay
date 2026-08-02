<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EstablishmentController;
use App\Http\Controllers\Api\FeeScheduleController;
use App\Http\Controllers\Api\FeeTypeController;
use App\Http\Controllers\Api\LearnerController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminTransactionController;
use App\Http\Controllers\Api\Admin\EstablishmentAdminController;
use App\Http\Controllers\Api\Admin\FraudAdminController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\StaffDashboardController;
use App\Http\Controllers\Api\StaffMemberController;
use App\Http\Controllers\Api\StaffSettlementController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StaffTransactionController;
use App\Http\Controllers\Api\TransactionController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Identity — connexion payeur (Firebase), staff établissement, super-admin (email+mdp)
    Route::post('auth/firebase', [AuthController::class, 'firebase'])->middleware('throttle:auth');
    Route::post('auth/staff/login', [AuthController::class, 'staffLogin'])->middleware('throttle:auth');
    Route::post('auth/admin/login', [AuthController::class, 'adminLogin'])->middleware('throttle:auth');
    Route::post('auth/refresh', [AuthController::class, 'refresh'])->middleware('throttle:auth');

    // Réglages plateforme (devise) — lecture publique
    Route::get('settings', [SettingsController::class, 'index']);

    // Tuition — recherche d'établissements + paiement (public : tiers autorisé)
    Route::get('establishments', [EstablishmentController::class, 'index']);
    Route::post('payments/quote', [PaymentController::class, 'quote'])->middleware('throttle:payment');
    Route::post('payments', [PaymentController::class, 'store'])->middleware('throttle:payment');

    // Payeur authentifié (JWT) : profil + historique de ses transactions
    Route::middleware('jwt')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::patch('me', [AuthController::class, 'updateProfile']);
        Route::get('transactions', [TransactionController::class, 'index']);
        Route::post('transactions', [TransactionController::class, 'store'])->middleware('throttle:payment');
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read', [NotificationController::class, 'read']);
    });

    // Super-admin abc pay — protégé par l'auth admin
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('establishments', [EstablishmentAdminController::class, 'index']);
        Route::post('establishments', [EstablishmentAdminController::class, 'store']);
        Route::patch('establishments/{establishment}', [EstablishmentAdminController::class, 'update']);
        Route::patch('establishments/{establishment}/login', [EstablishmentAdminController::class, 'updateLogin']);
        Route::get('transactions', [AdminTransactionController::class, 'index']);
        Route::get('dashboard', [AdminDashboardController::class, 'index']);
        Route::patch('me', [AuthController::class, 'updateAdminProfile']);
        Route::patch('settings', [SettingsController::class, 'update']);
        // Détection de fraude — revue & actions
        Route::get('fraud', [FraudAdminController::class, 'index']);
        Route::post('fraud/{flag}/dismiss', [FraudAdminController::class, 'dismiss']);
        Route::post('fraud/{flag}/block', [FraudAdminController::class, 'block']);
        // Gestion des comptes utilisateurs
        Route::get('users', [AdminUserController::class, 'index']);
        Route::get('users/{user}', [AdminUserController::class, 'show']);
        Route::post('users/{user}/block', [AdminUserController::class, 'block']);
        Route::post('users/{user}/unblock', [AdminUserController::class, 'unblock']);
        Route::post('users/{user}/disconnect', [AdminUserController::class, 'disconnect']);
        Route::delete('users/{user}', [AdminUserController::class, 'destroy']);
    });

    // Back-office établissement — protégé par l'auth staff (scopé à son établissement)
    Route::middleware('staff')->prefix('staff')->group(function () {
        Route::get('fee-types', [FeeTypeController::class, 'index']);
        Route::post('fee-types', [FeeTypeController::class, 'store']);
        Route::get('fee-schedules', [FeeScheduleController::class, 'index']);
        Route::post('fee-schedules', [FeeScheduleController::class, 'store']);
        Route::get('learners', [LearnerController::class, 'index']);
        Route::post('learners', [LearnerController::class, 'store']);
        Route::post('learners/{learner}/remind', [LearnerController::class, 'remind']);
        Route::get('transactions', [StaffTransactionController::class, 'index']);
        Route::get('settlements', [StaffSettlementController::class, 'index']);
        Route::get('dashboard', [StaffDashboardController::class, 'index']);
        Route::get('members', [StaffMemberController::class, 'index']);
        Route::post('members', [StaffMemberController::class, 'store']);
    });
});
