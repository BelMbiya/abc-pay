<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journal d'audit des actions administrateur (append-only). Trace QUI a fait QUOI et QUAND
 * (mutations POST/PATCH/DELETE de l'espace /admin). Consultable par le SUPER-ADMIN seul.
 * Le nom/rôle de l'admin sont DÉNORMALISÉS (snapshot) pour survivre à la suppression du compte.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->string('admin_id')->nullable()->index(); // qui (id du compte admin)
            $table->string('admin_name')->nullable();         // snapshot
            $table->string('admin_role', 40)->nullable();     // snapshot
            $table->string('action')->index();                // libellé métier (ex. « Reversement exécuté »)
            $table->string('method', 10);                     // POST | PATCH | DELETE
            $table->string('path');                           // chemin appelé
            $table->string('target_type', 60)->nullable();    // ressource visée (établissement, admin, user…)
            $table->string('target_id')->nullable();          // id de la ressource
            $table->json('meta')->nullable();                 // paramètres de route (non sensibles)
            $table->string('ip', 45)->nullable();
            $table->unsignedSmallInteger('status');           // code HTTP de la réponse
            $table->timestamp('created_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_audit_logs');
    }
};
