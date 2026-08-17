<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Rattache chaque transaction encaissée au reversement qui l'a soldée.
 * `settlement_id` NULL = encaissement confirmé encore EN ATTENTE de reversement.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->uuid('settlement_id')->nullable()->after('idempotency_key');
            $table->index(['establishment_id', 'status', 'settlement_id']);
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropIndex(['establishment_id', 'status', 'settlement_id']);
            $table->dropColumn('settlement_id');
        });
    }
};
