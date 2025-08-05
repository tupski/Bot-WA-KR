<?php

namespace Database\Factories;

use App\Models\Apartment;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Apartment>
 */
class ApartmentFactory extends Factory
{
    protected $model = Apartment::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $names = ['SKY HOUSE BSD', 'TREE PARK CITY', 'EMERALD TOWER', 'GOLDEN RESIDENCE', 'BLUE LAGOON'];
        $name = $this->faker->unique()->randomElement($names);
        $code = strtoupper(substr(str_replace(' ', '', $name), 0, 6));

        return [
            'name' => $name,
            'code' => $code,
            'whatsapp_group_id' => $this->faker->optional()->numerify('############@g.us'),
            'whatsapp_group_name' => $this->faker->optional()->words(3, true) . ' - Booking',
            'description' => $this->faker->optional()->paragraph,
            'is_active' => $this->faker->boolean(95), // 95% chance of being active
        ];
    }
}
