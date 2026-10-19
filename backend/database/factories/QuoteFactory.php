<?php

namespace Database\Factories;

use App\Models\Quote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Quote>
 */
class QuoteFactory extends Factory
{
    protected $model = Quote::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'name' => fake()->sentence(3),
            'type' => fake()->randomElement(['quote', 'wishlist']),
            'status' => fake()->randomElement(['added', 'requested', 'approved', 'rejected', 'paid']),
            'total' => 0,
            'checkout_allowed' => fake()->boolean(30),
        ];
    }
}
