<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reprises (clawback) de reversement : quand un remboursement est exécuté sur une
 * transaction DÉJÀ reversée à l'établissement, on crée ici une reprise du montant net.
 * Elle est déduite du PROCHAIN reversement de l'établissement (settlement_id posé à
 * l'application). Tant qu'elle n'est pas appliquée, elle réduit le « net à reverser ».
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settlement_adjustments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('establishment_id');
            $table->uuid('transaction_id')->nullable(); // transaction remboursée à l'origine
            $table->uuid('refund_id')->nullable();
            $table->decimal('amount', 14, 2);           // montant de la reprise (positif = dû par l'établissement)
            $table->string('currency', 8)->default('USD');
            $table->string('reason', 300)->nullable();
            $table->uuid('settlement_id')->nullable();  // reversement où la reprise a été appliquée (null = en attente)
            $table->timestamps();

            $table->index(['establishment_id', 'settlement_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settlement_adjustments');
    }
};
