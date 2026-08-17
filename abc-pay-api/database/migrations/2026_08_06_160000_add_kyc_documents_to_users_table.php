<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Vérification KYC documentaire : pièces stockées sur le disque PRIVÉ
 * (storage/app/private/kyc/… — jamais accessible par URL). Ces colonnes ne sont
 * réglées que par le KycService (hors allowlist du modèle) — anti mass-assignment.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('kyc_status')->default('none')->after('id_doc_number'); // none | pending | approved | rejected
            $table->string('kyc_id_front_path')->nullable()->after('kyc_status');
            $table->string('kyc_id_back_path')->nullable()->after('kyc_id_front_path');
            $table->string('kyc_selfie_path')->nullable()->after('kyc_id_back_path');
            $table->timestamp('kyc_submitted_at')->nullable()->after('kyc_selfie_path');
            $table->string('kyc_reviewed_by')->nullable()->after('kyc_submitted_at');
            $table->timestamp('kyc_reviewed_at')->nullable()->after('kyc_reviewed_by');
            $table->text('kyc_reject_reason')->nullable()->after('kyc_reviewed_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'kyc_status', 'kyc_id_front_path', 'kyc_id_back_path', 'kyc_selfie_path',
                'kyc_submitted_at', 'kyc_reviewed_by', 'kyc_reviewed_at', 'kyc_reject_reason',
            ]);
        });
    }
};
