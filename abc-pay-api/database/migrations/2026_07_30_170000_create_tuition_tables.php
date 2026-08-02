<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tranche « Tuition » : établissements + transactions + reçus.
 * Sous-ensemble de db/schema.sql, adapté à Eloquent (PK uuid).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('establishments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('name');
            $table->string('merchant_code')->unique();
            $table->string('type');
            $table->string('level'); // petit | secondaire | superieur
            $table->string('city')->nullable();
            $table->decimal('commission_rate', 5, 4)->default(0.02);
            $table->json('fees');     // types de frais proposés
            $table->json('presets');  // montants suggérés
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('transactions', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('establishment_id')->constrained('establishments');
            $table->string('student_name');
            $table->string('student_info')->nullable();
            $table->string('payer_name')->nullable();
            $table->string('payer_phone')->nullable();
            $table->string('payer_relation')->nullable();
            $table->string('fee_type');
            $table->string('channel'); // mpesa | airtel | orange | africell | visa
            $table->decimal('amount', 14, 2);
            $table->decimal('service_fee', 14, 2)->default(0);
            $table->decimal('commission', 14, 2)->default(0);
            $table->decimal('total', 14, 2);
            $table->string('currency', 3)->default('USD');
            $table->string('status')->default('confirmee');
            $table->string('reference')->nullable();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('receipts', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('transaction_id')->unique()->constrained('transactions');
            $table->string('number')->unique();
            $table->string('qr_token', 64)->unique();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('receipts');
        Schema::dropIfExists('transactions');
        Schema::dropIfExists('establishments');
    }
};
