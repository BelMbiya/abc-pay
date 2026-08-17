<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Canal par lequel le prospect souhaite être recontacté : whatsapp | email | appel.
 * Oriente l'équipe partenariats vers le bon geste de reprise de contact.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->string('contact_channel')->default('whatsapp')->after('email');
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $table->dropColumn('contact_channel');
        });
    }
};
