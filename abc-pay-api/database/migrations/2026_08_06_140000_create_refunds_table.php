<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demandes de remboursement (super-admin) : instruction + double validation (4 yeux).
 * L'exécution d'un remboursement approuvé bascule la transaction liée en « remboursee ».
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('transaction_id');
            $table->decimal('amount', 14, 2);
            $table->string('currency', 8)->default('USD');
            $table->string('reason');                       // motif de la demande
            $table->string('status')->default('demande');   // demande | approuve | rejete
            $table->string('requested_by');                 // email de l'initiateur
            $table->string('decided_by')->nullable();       // email du validateur (≠ initiateur)
            $table->text('decision_note')->nullable();
            $table->timestamp('decided_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
