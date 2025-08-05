<?php

namespace Database\Factories;

use App\Models\CustomerService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\CustomerService>
 */
class CustomerServiceFactory extends Factory
{
    protected $model = CustomerService::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => $this->faker->unique()->randomElement(['lia', 'sari', 'dina', 'maya', 'rina', 'tika']),
            'full_name' => $this->faker->name,
            'phone' => $this->faker->phoneNumber,
            'email' => $this->faker->unique()->safeEmail,
            'commission_rate' => $this->faker->randomFloat(1, 3, 8),
            'target_monthly' => $this->faker->numberBetween(1000000, 5000000),
            'join_date' => $this->faker->dateTimeBetween('-2 years', 'now'),
            'notes' => $this->faker->optional()->sentence,
            'is_active' => $this->faker->boolean(90), // 90% chance of being active
        ];
    }
}
