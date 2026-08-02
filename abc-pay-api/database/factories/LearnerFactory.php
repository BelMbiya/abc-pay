<?php

namespace Database\Factories;

use App\Models\Establishment;
use App\Models\Learner;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Learner>
 */
class LearnerFactory extends Factory
{
    protected $model = Learner::class;

    public function definition(): array
    {
        return [
            'establishment_id' => Establishment::factory(),
            'abcpay_ref' => 'ABCP-'.fake()->unique()->numerify('######'),
            'last_name' => fake()->lastName(),
            'middle_name' => fake()->lastName(),
            'first_name' => fake()->firstName(),
            'academic_group' => fake()->randomElement(['Bac 1 · Sciences Économiques', 'Bac 2 · Informatique de Gestion', 'Master 1 · Management']),
            'matricule' => 'ISC-2026-'.fake()->unique()->numerify('####'),
            'parent_name' => fake()->name(),
            'parent_phone' => '+2438'.fake()->numerify('########'),
            'parent_relation' => 'parent',
            'status' => 'actif',
            'balance' => fake()->randomElement([0, 150, 250, 320]),
        ];
    }
}
