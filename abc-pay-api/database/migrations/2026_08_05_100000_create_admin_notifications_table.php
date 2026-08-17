<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Fil de notifications OPÉRATIONNELLES du super-admin (fraude / support / système).
 *
 * Choix : table dédiée (et non `user_notifications`) car les admins vivent dans la
 * table `admins` (id bigint) et non `users` — les deux espaces d'id sont disjoints.
 * Le fil est PARTAGÉ par l'équipe admin (pas de ciblage par admin_id) : une alerte
 * de fraude/support concerne tous les opérateurs, à l'image des badges `openCount`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('type', 20);   // fraud | support | system
            $table->string('level', 12);  // info | warning | critical
            $table->string('title');
            $table->string('body', 500)->nullable();
            $table->json('meta')->nullable(); // { flag_id, ticket_id, reference, ... }
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['read_at', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
    }
};
