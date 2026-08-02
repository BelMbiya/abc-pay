<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Billing : barème (montant d'un type de frais par promotion) + postes de frais
 * (lignes de facturation individuelles par apprenant). Le solde d'un apprenant
 * = somme(amount_due - amount_paid) de ses postes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fee_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('establishment_id')->constrained('establishments');
            $table->foreignUuid('fee_type_id')->constrained('fee_types');
            $table->string('academic_group', 120)->nullable(); // null = toutes promotions
            $table->decimal('amount', 14, 2);
            $table->string('currency', 3)->default('USD');
            $table->timestamps();
        });

        Schema::create('fee_items', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('establishment_id')->constrained('establishments');
            $table->foreignUuid('learner_id')->constrained('learners');
            $table->foreignUuid('fee_type_id')->nullable()->constrained('fee_types');
            $table->string('label', 120);
            $table->decimal('amount_due', 14, 2);
            $table->decimal('amount_paid', 14, 2)->default(0);
            $table->string('currency', 3)->default('USD');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fee_items');
        Schema::dropIfExists('fee_schedules');
    }
};
