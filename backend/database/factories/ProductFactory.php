<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Series;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends Factory<Product>
 */
class ProductFactory extends Factory
{
    protected $model = Product::class;

    public function definition(): array
    {
        $name = fake()->unique()->words(3, true);
        $list = fake()->randomFloat(2, 400, 8000);

        return [
            'series_id' => Series::factory(),
            'name' => ucfirst($name),
            'slug' => Str::slug($name).'-'.fake()->unique()->numerify('###'),
            'description' => fake()->paragraph(),
            'list_price' => $list,
            'dealer_price' => round($list * 0.72, 2),
            'refresh_hz' => fake()->randomElement([1920, 3840, 7680]),
            'is_published' => true,
        ];
    }
}
