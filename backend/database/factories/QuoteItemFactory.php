<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<QuoteItem>
 */
class QuoteItemFactory extends Factory
{
    protected $model = QuoteItem::class;

    public function definition(): array
    {
        return [
            'quote_id' => Quote::factory(),
            'product_id' => Product::factory(),
            'quantity' => fake()->numberBetween(1, 12),
            'unit_price' => fake()->randomFloat(2, 400, 8000),
        ];
    }
}
