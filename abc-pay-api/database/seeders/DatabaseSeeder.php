<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Establishment;
use App\Models\EstablishmentStaff;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        // Compte super-admin de démo : admin@abcpay.cd / password
        Admin::updateOrCreate(
            ['email' => 'admin@abcpay.cd'],
            ['name' => 'Super Admin', 'password' => Hash::make('password'), 'role' => 'super_admin'],
        );

        // Établissements pilotes (miroir des données du front).
        $rows = [
            ['name' => 'École Maternelle Les Petits Génies', 'type' => 'École maternelle', 'level' => 'petit', 'city' => 'Kinshasa : Gombe', 'merchant_code' => 'ABC-TUITION-014', 'commission_rate' => 0.025, 'fees' => ['Frais scolaires', "Frais d'inscription"], 'presets' => [50, 80]],
            ['name' => 'Complexe Scolaire La Sagesse', 'type' => 'École primaire', 'level' => 'petit', 'city' => 'Kinshasa : Limete', 'merchant_code' => 'ABC-TUITION-021', 'commission_rate' => 0.025, 'fees' => ['Frais scolaires', 'Frais de cantine'], 'presets' => [60, 100]],
            ['name' => 'Institut Bonsomi', 'type' => 'École secondaire', 'level' => 'secondaire', 'city' => 'Kinshasa : Ngaliema', 'merchant_code' => 'ABC-TUITION-032', 'commission_rate' => 0.025, 'fees' => ['Frais scolaires', "Frais d'inscription", "Frais d'examen"], 'presets' => [70, 120, 200]],
            ['name' => 'Institut Supérieur de Commerce (ISC)', 'type' => 'Institut supérieur', 'level' => 'superieur', 'city' => 'Kinshasa : Gombe', 'merchant_code' => 'ABC-TUITION-045', 'commission_rate' => 0.02, 'fees' => ['Minerval', 'Frais académiques'], 'presets' => [150, 250]],
            ['name' => 'Université de Kinshasa (UNIKIN)', 'type' => 'Université', 'level' => 'superieur', 'city' => 'Kinshasa : Lemba', 'merchant_code' => 'ABC-TUITION-002', 'commission_rate' => 0.015, 'fees' => ['Minerval', 'Frais académiques', 'Frais de laboratoire'], 'presets' => [200, 350, 500]],
        ];

        foreach ($rows as $row) {
            $establishment = Establishment::updateOrCreate(['merchant_code' => $row['merchant_code']], $row);
            $establishment->update(['billing_mode' => 'fee_management']); // démo : soldes + imputation actifs

            // Types de frais + barème (montant par type, toutes promotions).
            $amounts = ['Minerval' => 500, 'Frais académiques' => 250, 'Frais scolaires' => 150, "Frais d'inscription" => 50, 'Frais de cantine' => 80, "Frais d'examen" => 25, 'Frais de laboratoire' => 40];
            $frequency = $row['level'] === 'superieur' ? 'Semestriel' : 'Trimestriel';
            foreach ($row['fees'] as $name) {
                $type = $establishment->feeTypes()->firstOrCreate(
                    ['name' => $name],
                    ['frequency' => $frequency, 'is_optional' => str_contains(mb_strtolower($name), 'laboratoire')],
                );
                $establishment->feeSchedules()->firstOrCreate(
                    ['fee_type_id' => $type->id, 'academic_group' => null],
                    ['amount' => $amounts[$name] ?? 100, 'currency' => 'USD'],
                );
            }

            // Compte staff de démo : direction@<code>.cd / password
            $email = 'direction@'.str_replace('abc-tuition-', 'ets', mb_strtolower($row['merchant_code'])).'.cd';
            $user = User::updateOrCreate(
                ['email' => $email],
                ['name' => 'Direction '.$establishment->name, 'password' => Hash::make('password')],
            );
            EstablishmentStaff::updateOrCreate(
                ['establishment_id' => $establishment->id, 'user_id' => $user->id],
                ['role' => 'direction'],
            );

            // Apprenants + postes de frais (soldes réels, avec variété payé/impayé).
            if ($establishment->learners()->count() === 0) {
                $billing = app(\App\Services\Billing\BillingService::class);
                \App\Models\Learner::factory()->count(6)->create(['establishment_id' => $establishment->id])
                    ->each(function (\App\Models\Learner $learner, int $i) use ($billing) {
                        $billing->generateFeeItemsForLearner($learner);
                        if ($i % 3 === 0) {
                            // À jour : tout payé.
                            $learner->feeItems()->update(['amount_paid' => \Illuminate\Support\Facades\DB::raw('amount_due')]);
                        } elseif ($i % 3 === 1) {
                            // Partiel : un poste soldé.
                            if ($item = $learner->feeItems()->first()) {
                                $item->update(['amount_paid' => $item->amount_due]);
                            }
                        }
                    });
            }
        }
    }
}
