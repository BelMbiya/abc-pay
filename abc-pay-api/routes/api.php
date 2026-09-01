<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EstablishmentController;
use App\Http\Controllers\Api\FaqController;
use App\Http\Controllers\Api\FeeScheduleController;
use App\Http\Controllers\Api\FeeTypeController;
use App\Http\Controllers\Api\LearnerController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\PaymentController;
use App\Http\Controllers\Api\PublicStatsController;
use App\Http\Controllers\Api\ReceiptVerificationController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\Admin\LeadAdminController;
use App\Http\Controllers\Api\Admin\ReviewAdminController;
use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\AdminNotificationController;
use App\Http\Controllers\Api\Admin\AdminTransactionController;
use App\Http\Controllers\Api\Admin\RefundAdminController;
use App\Http\Controllers\Api\Admin\KycAdminController;
use App\Http\Controllers\Api\Admin\AdminTeamController;
use App\Http\Controllers\Api\KycController;
use App\Http\Controllers\Api\RefundController;
use App\Http\Controllers\Api\Admin\EstablishmentAdminController;
use App\Http\Controllers\Api\Admin\EstablishmentDocumentAdminController;
use App\Http\Controllers\Api\Admin\SettlementAdminController;
use App\Http\Controllers\Api\Admin\FaqAdminController;
use App\Http\Controllers\Api\Admin\FraudAdminController;
use App\Http\Controllers\Api\Admin\AdminUserController;
use App\Http\Controllers\Api\Admin\SupportAdminController;
use App\Http\Controllers\Api\SupportController;
use App\Http\Controllers\Api\StaffDashboardController;
use App\Http\Controllers\Api\StaffMemberController;
use App\Http\Controllers\Api\StaffSettlementController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\StaffTransactionController;
use App\Http\Controllers\Api\StaffRefundController;
use App\Http\Controllers\Api\StaffPasswordController;
use App\Http\Controllers\Api\StaffSettingsController;
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

    // Chiffres agrégés pour la landing (public, aucune donnée nominative)
    Route::get('stats/public', [PublicStatsController::class, 'index']);

    // Avis approuvés (public) → section « témoignages » de la landing
    Route::get('reviews/public', [ReviewController::class, 'publicIndex']);

    // FAQ publiée (public) → section « Questions » de la landing + page /faq
    Route::get('faqs/public', [FaqController::class, 'publicIndex']);

    // Demande de démo / partenariat depuis la landing (public, rate-limité)
    Route::post('leads', [LeadController::class, 'store'])->middleware('throttle:lead');

    // Tuition — recherche d'établissements + paiement (public : tiers autorisé)
    Route::get('establishments', [EstablishmentController::class, 'index']);
    Route::post('payments/quote', [PaymentController::class, 'quote'])->middleware('throttle:payment');
    Route::post('payments', [PaymentController::class, 'store'])->middleware('throttle:payment');
    Route::get('payments/{transaction}/status', [PaymentController::class, 'status'])->middleware('throttle:payment');

    // Webhooks CinetPay (notify_url) — PAS de JWT, protégés par SIGNATURE (voir contrôleur).
    Route::post('webhooks/cinetpay/payment', [\App\Http\Controllers\Api\Webhooks\CinetPayController::class, 'payment'])->middleware('throttle:webhook');
    Route::post('webhooks/cinetpay/transfer', [\App\Http\Controllers\Api\Webhooks\CinetPayController::class, 'transfer'])->middleware('throttle:webhook');
    // Callback Araka (redirectURL) — PAS de JWT, protégé par signature HMAC + re-vérif statut.
    Route::post('webhooks/araka/payment', [\App\Http\Controllers\Api\Webhooks\ArakaController::class, 'payment'])->middleware('throttle:webhook');

    // Vérification d'authenticité d'un reçu (anti-fraude) — public, rate-limité.
    Route::post('receipts/verify', [ReceiptVerificationController::class, 'verify'])->middleware('throttle:verify');

    // Payeur authentifié (JWT) : profil + historique de ses transactions
    Route::middleware('jwt')->group(function () {
        Route::get('me', [AuthController::class, 'me']);
        Route::patch('me', [AuthController::class, 'updateProfile']);
        Route::get('transactions', [TransactionController::class, 'index']);
        Route::post('transactions', [TransactionController::class, 'store'])->middleware('throttle:payment');
        // Reçu complet (jeton d'authenticité) — titulaire uniquement, pour re-générer le PDF+QR.
        Route::get('transactions/{transaction}/receipt', [TransactionController::class, 'receipt']);
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read', [NotificationController::class, 'read']);
        // Support & sécurité du compte (payeur)
        Route::get('support/tickets', [SupportController::class, 'index']);
        Route::post('support/tickets', [SupportController::class, 'store']);
        Route::post('me/lock', [SupportController::class, 'lock']);
        // Laisser un avis (payeur)
        Route::post('reviews', [ReviewController::class, 'store']);
        // Remboursement — le payeur ouvre une demande sur SA propre opération
        Route::post('refunds', [RefundController::class, 'store'])->middleware('throttle:payment');
        // Vérification KYC (dépôt des pièces sur stockage privé + statut)
        Route::get('kyc', [KycController::class, 'status']);
        Route::post('kyc', [KycController::class, 'submit'])->middleware('throttle:auth');
    });

    // Super-admin abc pay — protégé par l'auth admin. Autorisation par PERMISSION (RBAC).
    Route::middleware(['admin', 'audit.admin'])->prefix('admin')->group(function () {
        // Accessibles à TOUT admin authentifié (propre compte / fil d'alertes / permissions).
        Route::patch('me', [AuthController::class, 'updateAdminProfile']);
        Route::post('password', [AuthController::class, 'changeAdminPassword'])->middleware('throttle:auth');
        Route::get('me/permissions', [AuthController::class, 'adminPermissions']);
        Route::get('notifications', [AdminNotificationController::class, 'index']);
        Route::post('notifications/read', [AdminNotificationController::class, 'read']);

        Route::middleware('admin.can:dashboard.view')->group(function () {
            Route::get('dashboard', [AdminDashboardController::class, 'index']);
        });

        Route::middleware('admin.can:transactions.view')->group(function () {
            Route::get('transactions', [AdminTransactionController::class, 'index']);
            Route::get('transactions/search', [AdminTransactionController::class, 'search']);
            Route::get('transactions/export', [AdminTransactionController::class, 'export']);
        });

        Route::middleware('admin.can:establishments.manage')->group(function () {
            Route::get('establishments', [EstablishmentAdminController::class, 'index']);
            Route::post('establishments', [EstablishmentAdminController::class, 'store']);
            Route::patch('establishments/{establishment}', [EstablishmentAdminController::class, 'update']);
            Route::patch('establishments/{establishment}/login', [EstablishmentAdminController::class, 'updateLogin']);
            Route::delete('establishments/{establishment}', [EstablishmentAdminController::class, 'destroy']);
            // Documents KYB (RDC) de l'établissement : état exigé/fourni + revue.
            Route::get('establishments/{establishment}/documents', [EstablishmentDocumentAdminController::class, 'index']);
            Route::post('establishments/{establishment}/documents', [EstablishmentDocumentAdminController::class, 'store']);
            Route::get('establishments/{establishment}/documents/{type}/file', [EstablishmentDocumentAdminController::class, 'file']);
        });

        // Reversements abc pay → établissement (voir l'en-attente, exécuter le versement).
        Route::middleware('admin.can:commissions.manage')->group(function () {
            Route::get('establishments/{establishment}/settlements', [SettlementAdminController::class, 'index']);
            Route::post('establishments/{establishment}/settlements', [SettlementAdminController::class, 'store']);
        });

        Route::middleware('admin.can:kyc.review')->group(function () {
            Route::get('kyc', [KycAdminController::class, 'index']);
            Route::get('kyc/{user}/document/{type}', [KycAdminController::class, 'document']);
            Route::post('kyc/{user}/decide', [KycAdminController::class, 'decide']);
        });

        Route::middleware('admin.can:refunds.manage')->group(function () {
            Route::get('refunds', [RefundAdminController::class, 'index']);
            Route::post('refunds', [RefundAdminController::class, 'store'])->middleware('throttle:payment');
            Route::post('refunds/{refund}/decide', [RefundAdminController::class, 'decide'])->middleware('throttle:payment');
        });

        Route::middleware('admin.can:fraud.manage')->group(function () {
            Route::get('fraud', [FraudAdminController::class, 'index']);
            Route::post('fraud/{flag}/dismiss', [FraudAdminController::class, 'dismiss']);
            Route::post('fraud/{flag}/block', [FraudAdminController::class, 'block']);
        });

        Route::middleware('admin.can:users.manage')->group(function () {
            Route::get('users', [AdminUserController::class, 'index']);
            Route::post('users', [AdminUserController::class, 'store']);
            Route::get('users/{user}', [AdminUserController::class, 'show']);
            Route::get('users/{user}/transactions', [AdminUserController::class, 'transactions']);
            Route::post('users/{user}/block', [AdminUserController::class, 'block']);
            Route::post('users/{user}/unblock', [AdminUserController::class, 'unblock']);
            Route::post('users/{user}/disconnect', [AdminUserController::class, 'disconnect']);
            Route::delete('users/{user}', [AdminUserController::class, 'destroy']);
        });

        Route::middleware('admin.can:support.manage')->group(function () {
            Route::get('support', [SupportAdminController::class, 'index']);
            Route::post('support/{ticket}/respond', [SupportAdminController::class, 'respond']);
        });

        Route::middleware('admin.can:leads.manage')->group(function () {
            Route::get('leads', [LeadAdminController::class, 'index']);
            Route::patch('leads/{lead}', [LeadAdminController::class, 'update']);
            Route::delete('leads/{lead}', [LeadAdminController::class, 'destroy']);
        });

        Route::middleware('admin.can:reviews.moderate')->group(function () {
            Route::get('reviews', [ReviewAdminController::class, 'index']);
            Route::post('reviews/{review}/approve', [ReviewAdminController::class, 'approve']);
            Route::post('reviews/{review}/reject', [ReviewAdminController::class, 'reject']);
        });

        Route::middleware('admin.can:faq.manage')->group(function () {
            Route::get('faqs', [FaqAdminController::class, 'index']);
            Route::post('faqs', [FaqAdminController::class, 'store']);
            Route::patch('faqs/{faq}', [FaqAdminController::class, 'update']);
            Route::delete('faqs/{faq}', [FaqAdminController::class, 'destroy']);
        });

        Route::middleware('admin.can:settings.manage')->group(function () {
            Route::patch('settings', [SettingsController::class, 'update']);
        });

        // Gestion de l'ÉQUIPE d'administrateurs (super-admin uniquement via la permission admins.manage).
        Route::middleware('admin.can:admins.manage')->group(function () {
            Route::get('admins', [AdminTeamController::class, 'index']);
            Route::post('admins', [AdminTeamController::class, 'store'])->middleware('throttle:auth');
            Route::patch('admins/{admin}', [AdminTeamController::class, 'update']);
            Route::post('admins/{admin}/reset-password', [AdminTeamController::class, 'resetPassword'])->middleware('throttle:auth');
            Route::delete('admins/{admin}', [AdminTeamController::class, 'destroy']);
        });

        // Journal d'audit des actions admin (LECTURE) — super-admin uniquement (audit.view).
        Route::middleware('admin.can:audit.view')->group(function () {
            Route::get('audit-logs', [\App\Http\Controllers\Api\Admin\AdminAuditController::class, 'index']);
        });
    });

    // Back-office établissement — protégé par l'auth staff (scopé à son établissement)
    Route::middleware('staff')->prefix('staff')->group(function () {
        Route::get('fee-types', [FeeTypeController::class, 'index']);
        Route::post('fee-types', [FeeTypeController::class, 'store']);
        Route::patch('fee-types/{feeType}', [FeeTypeController::class, 'update']);
        Route::delete('fee-types/{feeType}', [FeeTypeController::class, 'destroy']);
        Route::get('fee-schedules', [FeeScheduleController::class, 'index']);
        Route::post('fee-schedules', [FeeScheduleController::class, 'store']);
        Route::patch('fee-schedules/{feeSchedule}', [FeeScheduleController::class, 'update']);
        Route::delete('fee-schedules/{feeSchedule}', [FeeScheduleController::class, 'destroy']);
        Route::get('learners', [LearnerController::class, 'index']);
        Route::post('learners', [LearnerController::class, 'store']);
        Route::post('learners/import', [LearnerController::class, 'import'])->middleware('throttle:payment');
        Route::post('learners/{learner}/remind', [LearnerController::class, 'remind']);
        Route::get('learners/{learner}/statement', [LearnerController::class, 'statement']);
        // Documents KYB de l'établissement (dépôt par la direction).
        Route::get('documents', [\App\Http\Controllers\Api\StaffDocumentController::class, 'index']);
        Route::post('documents', [\App\Http\Controllers\Api\StaffDocumentController::class, 'store'])->middleware('throttle:auth');
        Route::get('transactions', [StaffTransactionController::class, 'index']);
        // Changement de mot de passe (accessible même quand l'accès est gaté à la 1re connexion)
        Route::post('password', [StaffPasswordController::class, 'update'])->middleware('throttle:auth');
        // Vérification KYC du compte staff (accessible même quand l'accès est gaté)
        Route::get('kyc', [KycController::class, 'status']);
        Route::post('kyc', [KycController::class, 'submit'])->middleware('throttle:auth');
        // Remboursements — l'établissement ouvre une demande + valide au premier niveau
        Route::get('refunds', [StaffRefundController::class, 'index']);
        Route::post('refunds', [StaffRefundController::class, 'store'])->middleware('throttle:payment');
        Route::post('refunds/{refund}/decide', [StaffRefundController::class, 'decide'])->middleware('throttle:payment');
        Route::get('settlements', [StaffSettlementController::class, 'index']);
        Route::get('dashboard', [StaffDashboardController::class, 'index']);
        Route::get('members', [StaffMemberController::class, 'index']);
        // Réglages propres à l'établissement
        Route::get('settings', [StaffSettingsController::class, 'show']);
        Route::put('settings', [StaffSettingsController::class, 'update']);
        // Notifications de l'établissement (même contrôleur, scopé au user staff).
        // Endpoint DÉDIÉ au scope staff → évite le 401 (et la déconnexion) qu'un
        // token staff subissait en tapant le /notifications payeur.
        Route::get('notifications', [NotificationController::class, 'index']);
        Route::post('notifications/read', [NotificationController::class, 'read']);
        // Support (l'établissement ouvre/consulte ses tickets)
        Route::get('support/tickets', [SupportController::class, 'index']);
        Route::post('support/tickets', [SupportController::class, 'store']);
        // Laisser un avis (établissement)
        Route::post('reviews', [ReviewController::class, 'store']);
    });
});
