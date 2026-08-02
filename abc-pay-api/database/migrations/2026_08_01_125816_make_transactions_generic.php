<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Généralise la table `transactions` : tout type de mouvement (tuition, envoi,
 * réception, paiement de service), pas seulement Tuition.
 *  - `type` : tuition | send | receive | service
 *  - `direction` : debit (sortie) | credit (entrée)
 *  - contrepartie (destinataire/émetteur) + libellé (nom du service)
 *  - les colonnes propres à Tuition deviennent nullables.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('type')->default('tuition')->after('id');
            $table->string('direction')->default('debit')->after('type');
            $table->string('counterparty_name')->nullable()->after('payer_relation');
            $table->string('counterparty_phone')->nullable()->after('counterparty_name');
            $table->string('label')->nullable()->after('counterparty_phone');
        });

        // Colonnes spécifiques Tuition → nullables (les autres types ne les remplissent pas).
        Schema::table('transactions', function (Blueprint $table) {
            $table->uuid('establishment_id')->nullable()->change();
            $table->string('student_name')->nullable()->change();
            $table->string('fee_type')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['type', 'direction', 'counterparty_name', 'counterparty_phone', 'label']);
        });
    }
};
