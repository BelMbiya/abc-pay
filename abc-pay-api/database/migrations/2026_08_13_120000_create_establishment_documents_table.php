<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Documents KYB d'un établissement/marchand (RDC) : RCCM, Id. Nat., NIF, siège,
 * pièce du responsable, agrément ministère, patente. Chaque pièce a un numéro
 * (le cas échéant), un éventuel fichier, et un statut de revue par le super-admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('establishment_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('establishment_id');
            $table->string('type', 40);       // clé du catalogue (rccm, nif, id_nat, …)
            $table->string('number', 120)->nullable(); // n° d'immatriculation / référence
            $table->string('file_path', 300)->nullable(); // pièce téléversée (optionnel)
            $table->string('status', 16)->default('pending'); // pending | approved | rejected
            $table->string('note', 300)->nullable();      // motif de rejet / remarque
            $table->uuid('reviewed_by')->nullable();       // admin ayant statué
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();

            $table->unique(['establishment_id', 'type']);
            $table->index(['establishment_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('establishment_documents');
    }
};
