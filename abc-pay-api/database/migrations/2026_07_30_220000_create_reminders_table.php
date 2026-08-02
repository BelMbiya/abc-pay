<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Module Notification : relances envoyées aux apprenants en dette.
 * (L'envoi réel SMS/email sera branché sur le fournisseur ; ici on trace.)
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('establishment_id')->constrained('establishments');
            $table->foreignUuid('learner_id')->constrained('learners');
            $table->string('channel', 10)->default('sms'); // sms | email
            $table->timestamp('sent_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
