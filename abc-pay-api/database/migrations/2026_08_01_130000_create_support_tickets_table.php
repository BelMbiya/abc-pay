<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Support & litiges : file de traitement persistée. Un utilisateur ouvre un ticket
 * (litige de transaction, compte usurpé, appareil perdu, accès…) ; le super-admin
 * traite (répond / résout). Statut : open → in_progress → resolved.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('support_tickets', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->unsignedBigInteger('user_id')->nullable(); // auteur (payeur), null si anonyme
            $table->string('reference', 20)->unique();          // n° lisible : TCK-YYYY-NNNNN
            $table->string('category', 24);                     // dispute | compromised | lost_device | access | other
            $table->string('subject', 180);
            $table->text('message');
            $table->string('tx_reference')->nullable();         // n° de reçu/transaction concerné (litige)
            $table->string('priority', 12)->default('normal');  // low | normal | high | urgent
            $table->string('status', 16)->default('open');      // open | in_progress | resolved
            $table->text('admin_response')->nullable();
            $table->timestamp('resolved_at')->nullable();
            $table->string('resolved_by')->nullable();          // admin (email)
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('support_tickets');
    }
};
