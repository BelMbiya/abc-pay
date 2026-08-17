<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Demandes de démo / partenariat émises depuis la landing publique.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('establishment_name');
            $table->string('contact_name');
            $table->string('phone');
            $table->string('profile')->nullable();   // école | supérieur | réseau | opérateur | investisseur | autre
            $table->text('message')->nullable();
            $table->string('source')->default('landing');
            $table->string('status')->default('nouveau'); // nouveau | contacte | qualifie | clos
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leads');
    }
};
