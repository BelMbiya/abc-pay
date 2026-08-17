<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Résultat de l'OCR SERVEUR (lecture de la pièce d'identité) : texte extrait +
 * verdict de correspondance avec les infos déclarées. Sert la décision auto et
 * l'aide à la revue admin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('kyc_ocr_text')->nullable()->after('kyc_reject_reason');
            $table->boolean('kyc_ocr_match')->nullable()->after('kyc_ocr_text'); // null = OCR indisponible
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['kyc_ocr_text', 'kyc_ocr_match']);
        });
    }
};
