<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Avis laissés par les payeurs / établissements. Modérés avant d'apparaître
 * publiquement (section « témoignages » de la landing).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('author_type');                 // user | staff
            $table->unsignedBigInteger('author_id')->nullable();
            $table->string('author_name');
            $table->string('author_role')->nullable();     // « Parent », « Directrice financière »…
            $table->string('context')->nullable();         // établissement / ville
            $table->unsignedTinyInteger('rating')->default(5); // 1..5
            $table->text('message');
            $table->string('status')->default('pending');  // pending | approved | rejected
            $table->string('moderated_by')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
