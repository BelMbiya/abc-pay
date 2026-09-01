<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * État de lecture PAR ADMINISTRATEUR du fil de notifications (partagé par l'équipe).
 * Le fil reste commun, mais « lu / non-lu » devient individuel : quand un admin marque
 * lu, ça n'efface plus le badge des autres.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notification_reads', function (Blueprint $table) {
            $table->id();
            $table->string('admin_id')->index();
            $table->uuid('admin_notification_id')->index();
            $table->timestamp('read_at');
            $table->unique(['admin_id', 'admin_notification_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notification_reads');
    }
};
