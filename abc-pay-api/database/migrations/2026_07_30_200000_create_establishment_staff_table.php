<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Personnel d'établissement (RBAC interne) : un compte utilisateur rattaché à
 * un établissement avec un rôle (direction, comptable, caissier, consultation).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('establishment_staff', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('establishment_id')->constrained('establishments');
            $table->foreignUuid('user_id')->constrained('users');
            $table->string('role', 20); // direction | comptable | caissier | consultation
            $table->timestamps();
            $table->unique(['establishment_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('establishment_staff');
    }
};
