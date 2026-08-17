<?php

namespace Database\Factories;

use App\Models\Establishment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Establishment>
 */
class EstablishmentFactory extends Factory
{
    protected $model = Establishment::class;

    public function definition(): array
    {
        return [
            'name' => fake()->company(),
            'merchant_code' => 'ABC-TUITION-'.fake()->unique()->numberBetween(1000, 9999),
            'type' => 'Institut supérieur',
            'level' => 'superieur',
            'city' => 'Kinshasa',
            'commission_rate' => 0.02,
            'fees' => ['Minerval', 'Frais académiques'],
            'presets' => [250, 350], // barème apparié : Minerval=250, Frais académiques=350
            'is_active' => true,
        ];
    }

    /** Établissement de niveau primaire/secondaire (frais de service 2 %). */
    public function school(): static
    {
        return $this->state(fn () => [
            'type' => 'École secondaire',
            'level' => 'secondaire',
            'fees' => ['Frais scolaires', "Frais d'inscription"],
            'presets' => [70, 120],
        ]);
    }
}
