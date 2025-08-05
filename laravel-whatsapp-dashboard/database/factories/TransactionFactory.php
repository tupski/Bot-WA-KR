<?php

namespace Database\Factories;

use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\Factory;


/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Transaction>
 */
class TransactionFactory extends Factory
{
    protected $model = Transaction::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $amount = $this->faker->numberBetween(200000, 1000000);
        $commissionRate = $this->faker->randomFloat(1, 3, 8);
        $commission = round($amount * $commissionRate / 100);

        return [
            'message_id' => 'test_' . $this->faker->unique()->uuid,
            'location' => $this->faker->randomElement(['SKY HOUSE BSD', 'TREE PARK', 'EMERALD TOWER']),
            'unit' => $this->faker->randomElement(['A', 'B', 'C']) . $this->faker->numberBetween(101, 999),
            'checkout_time' => $this->faker->time('H:i'),
            'duration' => $this->faker->randomElement(['1 jam', '2 jam', '3 jam', '4 jam']),
            'payment_method' => $this->faker->randomElement(['Cash', 'TF']),
            'cs_name' => $this->faker->randomElement(['lia', 'sari', 'dina', 'maya']),
            'amount' => $amount,
            'commission' => $commission,
            'net_amount' => $amount - $commission,
            'date_only' => $this->faker->dateTimeBetween('-30 days', 'now'),
            'skip_financial' => $this->faker->boolean(10), // 10% chance
        ];
    }
}
