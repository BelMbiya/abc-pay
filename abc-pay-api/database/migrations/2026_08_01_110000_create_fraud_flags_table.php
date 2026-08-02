<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Signalements de fraude persistés (LBC/FT). Chaque transaction est évaluée par un
 * moteur de règles ; si elle dépasse un seuil, un signalement est enregistré ici pour
 * revue par le super-admin (écarter / bloquer le compte).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fraud_flags', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('transaction_id')->nullable();       // transactions.id (uuid)
            $table->unsignedBigInteger('user_id')->nullable();  // users.id (auteur)
            $table->string('rule', 40);                          // large_amount | failed | self_send | velocity | no_kyc | blocked
            $table->string('severity', 12);                      // low | medium | high
            $table->unsignedSmallInteger('score');               // 0-100
            $table->string('reason');
            $table->string('status', 12)->default('open');       // open | dismissed | actioned
            $table->timestamp('resolved_at')->nullable();
            $table->string('resolved_by')->nullable();           // admin (email)
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fraud_flags');
    }
};
