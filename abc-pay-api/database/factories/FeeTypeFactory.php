<?php

namespace Database\Factories;

use App\Models\Establishment;
use App\Models\FeeType;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<FeeType>
 */
class FeeTypeFactory extends Factory
{
    protected $model = FeeType::class;

    public function definition(): array
    {
        return [
            'establishment_id' => Establishment::factory(),
            'name' => fake()->randomElement(['Minerval', 'Frais d\'inscription', 'Frais d\'examen']),
            'frequency' => fake()->randomElement(['Unique', 'Mensuel', 'Trimestriel', 'Semestriel', 'Par crédit']),
            'is_optional' => false,
        ];
    }
}
