<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Module Academic : apprenants (élèves/étudiants) d'un établissement.
 * Le solde est mis à 0 pour l'instant (calculé à partir des postes de frais
 * quand le module de facturation individuelle sera en place).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('learners', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('establishment_id')->constrained('establishments');
            $table->string('abcpay_ref')->unique();       // identifiant abc pay stable
            $table->string('last_name', 80);              // nom
            $table->string('middle_name', 80)->nullable(); // post-nom
            $table->string('first_name', 80);             // prénom
            $table->string('academic_group', 120)->nullable(); // classe / filière-promotion
            $table->string('matricule', 60)->nullable();
            $table->string('parent_name', 160)->nullable();
            $table->string('parent_phone', 20)->nullable();
            $table->string('parent_relation', 20)->nullable(); // parent | tuteur | proche
            $table->string('status', 20)->default('actif');    // actif | redoublant | diplome | transfere | abandon
            $table->decimal('balance', 14, 2)->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('learners');
    }
};
