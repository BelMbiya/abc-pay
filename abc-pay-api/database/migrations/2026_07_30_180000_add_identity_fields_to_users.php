<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Module Identity : connexion payeur par numéro (OTP délégué à Firebase).
 * Le téléphone devient un identifiant ; name/email deviennent optionnels
 * (un payeur peut n'avoir qu'un numéro).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('phone', 20)->nullable()->unique()->after('email');
            $table->string('firebase_uid')->nullable()->unique()->after('phone');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->change();
            $table->string('email')->nullable()->change();
            $table->string('password')->nullable()->change(); // payeur OTP : pas de mot de passe
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['phone']);
            $table->dropUnique(['firebase_uid']);
            $table->dropColumn(['phone', 'firebase_uid']);
        });
    }
};
