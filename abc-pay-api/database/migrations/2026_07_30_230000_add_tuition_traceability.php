<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Traçabilité Tuition : un paiement enregistre l'apprenant concerné, lié à
 * l'établissement (source = paiement), et la transaction pointe vers lui.
 * But : traçabilité, pas une base d'apprenants exhaustive.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('learners', function (Blueprint $table) {
            $table->string('source', 12)->default('registre')->after('status'); // registre | paiement
        });
        Schema::table('learners', function (Blueprint $table) {
            $table->string('first_name', 80)->nullable()->change(); // apprenant tracé : nom complet dans last_name
        });
        Schema::table('transactions', function (Blueprint $table) {
            $table->foreignUuid('learner_id')->nullable()->after('establishment_id')->constrained('learners');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropConstrainedForeignId('learner_id');
        });
        Schema::table('learners', function (Blueprint $table) {
            $table->dropColumn('source');
        });
    }
};
