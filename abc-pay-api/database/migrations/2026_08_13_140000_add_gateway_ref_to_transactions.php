<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `gateway_ref` : le `merchant_transaction_id` envoyé à CinetPay (≤ 30 caractères).
 * Notre PK est un UUID (36 c.) trop long pour ce champ → on utilise une réf courte,
 * unique, avec laquelle on retrouve la transaction au webhook / à la vérification.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('gateway_ref', 40)->nullable()->unique()->after('notify_token');
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn('gateway_ref');
        });
    }
};
