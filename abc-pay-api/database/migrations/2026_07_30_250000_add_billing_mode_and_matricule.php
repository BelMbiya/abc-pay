<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Réconciliation par matricule + mode de facturation.
 * - billing_mode : payment_only (défaut) | fee_management (soldes + imputation).
 * - transactions.student_matricule : clé de réconciliation saisie au paiement.
 * - learners : matricule unique par établissement (obligatoire pour un inscrit).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('establishments', function (Blueprint $table) {
            $table->string('billing_mode', 20)->default('payment_only')->after('commission_rate');
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('student_matricule', 60)->nullable()->after('student_info');
        });
        Schema::table('learners', function (Blueprint $table) {
            $table->unique(['establishment_id', 'matricule']);
        });
    }

    public function down(): void
    {
        Schema::table('learners', function (Blueprint $table) {
            $table->dropUnique(['establishment_id', 'matricule']);
        });
        Schema::table('transactions', fn (Blueprint $t) => $t->dropColumn('student_matricule'));
        Schema::table('establishments', fn (Blueprint $t) => $t->dropColumn('billing_mode'));
    }
};
