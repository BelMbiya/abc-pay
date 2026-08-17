<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Exigence KYC pour les comptes back-office établissement.
 * Défaut FALSE → les comptes DÉJÀ existants sont exemptés (grandfathering).
 * Les comptes créés désormais sont marqués `true` et devront être vérifiés
 * (identité approuvée) pour accéder à l'espace, agir et se connecter pleinement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('establishment_staff', function (Blueprint $table) {
            $table->boolean('kyc_required')->default(false)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('establishment_staff', function (Blueprint $table) {
            $table->dropColumn('kyc_required');
        });
    }
};
