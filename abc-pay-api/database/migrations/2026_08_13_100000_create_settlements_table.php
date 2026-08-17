<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reversements RÉELS abc pay → établissement. Un reversement est un ACTE exécuté
 * par le super-admin : il agrège les encaissements confirmés encore « en attente »
 * (transactions sans `settlement_id`), les fige dans une ligne, et les marque comme
 * reversés. Remplace l'ancien calcul « à la volée » (hebdomadaire arbitraire).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settlements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('establishment_id');
            $table->date('period_start')->nullable(); // 1er encaissement couvert
            $table->date('period_end')->nullable();    // dernier encaissement couvert
            $table->decimal('gross', 14, 2)->default(0);       // brut encaissé
            $table->decimal('commission', 14, 2)->default(0);  // part abc pay
            $table->decimal('net', 14, 2)->default(0);         // net reversé
            $table->string('currency', 8)->default('USD');
            $table->unsignedInteger('transactions_count')->default(0);
            $table->string('status', 16)->default('paid'); // 'paid' (reversé) — extensible
            $table->string('reference', 120)->nullable();   // réf. du versement (mobile money / banque)
            $table->uuid('executed_by')->nullable();         // admin abc pay ayant exécuté
            $table->timestamp('paid_at')->nullable();
            $table->timestamps();

            $table->index(['establishment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settlements');
    }
};
