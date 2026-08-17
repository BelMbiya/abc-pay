<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Colonnes passerelle CinetPay :
 *  - transactions : jeton de paiement + jeton de notification + nom de passerelle.
 *  - settlements  : référence du reversement CinetPay + jeton de notification.
 *  - establishments : numéro (et méthode) de réception des reversements.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->string('gateway', 30)->nullable()->after('status');       // ex. 'cinetpay'
            $table->string('payment_token', 191)->nullable()->after('gateway');
            $table->string('notify_token', 191)->nullable()->after('payment_token');
        });

        Schema::table('settlements', function (Blueprint $table) {
            $table->string('gateway', 30)->nullable()->after('status');
            $table->string('gateway_transfer_id', 191)->nullable()->after('gateway');
            $table->string('notify_token', 191)->nullable()->after('gateway_transfer_id');
        });

        Schema::table('establishments', function (Blueprint $table) {
            $table->string('payout_phone', 30)->nullable()->after('currency');
            $table->string('payout_method', 30)->nullable()->after('payout_phone'); // opérateur RDC
        });
    }

    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            $table->dropColumn(['gateway', 'payment_token', 'notify_token']);
        });
        Schema::table('settlements', function (Blueprint $table) {
            $table->dropColumn(['gateway', 'gateway_transfer_id', 'notify_token']);
        });
        Schema::table('establishments', function (Blueprint $table) {
            $table->dropColumn(['payout_phone', 'payout_method']);
        });
    }
};
