<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * FAQ gérée depuis le super-admin. Les entrées PUBLIÉES alimentent la section
 * « Questions » de la landing (et la page /faq) — à l'image des avis approuvés
 * qui alimentent les témoignages.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faqs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('category', 60)->nullable();  // regroupement (page /faq)
            $table->string('question', 300);
            $table->text('answer');
            $table->unsignedSmallInteger('position')->default(0); // ordre d'affichage
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['is_published', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faqs');
    }
};
