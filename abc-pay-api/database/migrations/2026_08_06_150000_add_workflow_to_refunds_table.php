<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Circuit de validation des remboursements :
 *  - Tuition : l'ÉTABLISSEMENT concerné valide d'abord, puis l'ADMINISTRATEUR acte.
 *    Si l'établissement refuse, l'admin ne peut exécuter qu'en FORÇANT (force majeure).
 *  - Non-Tuition : validation administrateur seule.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->uuid('establishment_id')->nullable()->after('transaction_id');
            $table->boolean('needs_establishment')->default(false)->after('currency');
            $table->string('establishment_decision')->nullable()->after('needs_establishment'); // approuve | refuse
            $table->string('establishment_decided_by')->nullable()->after('establishment_decision');
            $table->timestamp('establishment_decided_at')->nullable()->after('establishment_decided_by');
            $table->boolean('forced')->default(false)->after('decided_at');       // admin a forcé malgré un refus établissement
            $table->text('force_reason')->nullable()->after('forced');            // justification de force majeure
        });
    }

    public function down(): void
    {
        Schema::table('refunds', function (Blueprint $table) {
            $table->dropColumn([
                'establishment_id', 'needs_establishment', 'establishment_decision',
                'establishment_decided_by', 'establishment_decided_at', 'forced', 'force_reason',
            ]);
        });
    }
};
