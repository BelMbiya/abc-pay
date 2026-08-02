<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Déconnexion forcée (« force logout ») : tout jeton émis AVANT cet instant est refusé.
 * Permet au super-admin de révoquer toutes les sessions d'un utilisateur (appareil perdu,
 * compte usurpé) sans attendre l'expiration des jetons.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('sessions_revoked_at')->nullable()->after('blocked_reason');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('sessions_revoked_at');
        });
    }
};
