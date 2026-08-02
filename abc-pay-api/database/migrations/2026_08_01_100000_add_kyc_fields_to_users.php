<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * KYC « infos seulement » : identité de l'utilisateur exigée/stockée sur son profil,
 * réutilisée ailleurs (préremplissage, reçus, conformité). Plus statut de compte
 * (blocage) requis par le moteur de fraude.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->date('birth_date')->nullable()->after('phone');
            $table->string('gender', 12)->nullable()->after('birth_date');        // M | F | autre
            $table->string('address')->nullable()->after('gender');
            $table->string('city', 120)->nullable()->after('address');
            $table->string('id_doc_type', 32)->nullable()->after('city');          // carte_electeur | passeport | permis
            $table->string('id_doc_number', 64)->nullable()->after('id_doc_type');
            $table->timestamp('profile_completed_at')->nullable()->after('id_doc_number');
            $table->boolean('is_blocked')->default(false)->after('profile_completed_at');
            $table->string('blocked_reason')->nullable()->after('is_blocked');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'birth_date', 'gender', 'address', 'city',
                'id_doc_type', 'id_doc_number', 'profile_completed_at',
                'is_blocked', 'blocked_reason',
            ]);
        });
    }
};
