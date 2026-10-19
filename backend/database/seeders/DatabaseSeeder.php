<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Quote;
use App\Models\QuoteItem;
use App\Models\Series;
use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = 'password';

        $admin = User::factory()->role('admin')->create([
            'name' => 'Avery Admin',
            'email' => 'admin@example.com',
            'password' => $password,
        ]);

        $sales = User::factory()->role('sales')->create([
            'name' => 'Sam Sales',
            'email' => 'sales@example.com',
            'password' => $password,
        ]);

        $dealer = User::factory()->role('dealer')->create([
            'name' => 'Dana Dealer',
            'email' => 'dealer@example.com',
            'password' => $password,
        ]);

        $client = User::factory()->role('client')->create([
            'name' => 'Casey Client',
            'email' => 'client@example.com',
            'password' => $password,
        ]);

        User::factory()->count(2)->role('sales')->create();
        User::factory()->count(3)->role('dealer')->create();
        User::factory()->count(8)->role('client')->create();

        $catalog = [
            'LED' => [
                'J Series' => [
                    'summary' => 'Indoor fine-pitch cabinets for rooms where the congregation sits close to the image.',
                    'products' => [
                        ['J 2.6', 'Indoor cabinet for camera-close seating.', 3840],
                        ['J 3.9', 'A step coarser, for wider rooms and longer viewing distance.', 3840],
                        ['J 4.8', 'Larger pixel pitch for balconies and deep sanctuaries.', 1920],
                    ],
                ],
                'JHD Series' => [
                    'summary' => 'Native 16:9 cabinets so common wall sizes land on 1080 or 4K without scaling.',
                    'products' => [
                        ['JHD 1.9 16:9', 'Fine pitch for broadcast and IMAG.', 7680],
                        ['JHD 2.6 16:9', 'The everyday worship wall.', 3840],
                        ['JHD 3.9 16:9', 'Larger rooms, still a 16:9 cabinet.', 3840],
                    ],
                ],
                'JW Series' => [
                    'summary' => 'Weather-rated cabinets for outdoor platforms and campus entries.',
                    'products' => [
                        ['JW 2.9', 'Outdoor pitch for a covered platform.', 3840],
                        ['JW 3.9', 'Outdoor wall for a lawn or plaza.', 3840],
                        ['JW 4.8', 'Long-throw outdoor image.', 1920],
                    ],
                ],
                'JE Series' => [
                    'summary' => 'Rental cabinets meant to stack, fly, and come apart between services.',
                    'products' => [
                        ['JE 2.6', 'Touring pitch for filmed events.', 3840],
                        ['JE 3.9', 'General-purpose rental cabinet.', 3840],
                        ['JE 5.9', 'Fast-deploy cabinet for large rooms.', 1920],
                    ],
                ],
            ],
            'Lighting' => [
                'Versa Series' => [
                    'summary' => 'Moving wash, spot, and beam fixtures for a platform that changes week to week.',
                    'products' => [
                        ['Versa Wash 19', 'Wide wash for a choir or band.', null],
                        ['Versa Spot 15', 'Tight spot for a speaker or soloist.', null],
                        ['Versa Beam 7', 'Narrow beam for aerial looks.', null],
                    ],
                ],
                'HL Series' => [
                    'summary' => 'Static wash and accent fixtures for houses that do not need moving lights.',
                    'products' => [
                        ['HL Par 200', 'LED par for a general wash.', null],
                        ['HL Bar 1000', 'Linear wash for the width of a platform.', null],
                        ['HL Fresnel 300', 'Soft key light for a face on camera.', null],
                    ],
                ],
                'Intelligent Series' => [
                    'summary' => 'Profile, spot, and wash fixtures with the control a lighting console expects.',
                    'products' => [
                        ['Intelligent Spot 350', 'Mid-air spot with gobos.', null],
                        ['Intelligent Profile 400', 'Shuttered profile for scenic edges.', null],
                        ['Intelligent Wash 600', 'High-output wash for a large room.', null],
                    ],
                ],
                'CTC Series' => [
                    'summary' => 'Soft panels and color-tunable light for faces, sets, and broadcast.',
                    'products' => [
                        ['CTC Panel 1x1', 'Face light that stays kind on camera.', null],
                        ['CTC Panel 2x1', 'Wider soft source for a set or baptistry.', null],
                        ['CTC Soft 200', 'Smaller panel for a lectern or interview.', null],
                    ],
                ],
            ],
            'Audio' => [
                'JLA Series' => [
                    'summary' => 'Point-source loudspeakers for speech in rooms that do not need a line array.',
                    'products' => [
                        ['JLA 8', 'Compact cabinet for a small room.', null],
                        ['JLA 12', 'Main cabinet for a mid-size sanctuary.', null],
                        ['JLA 15', 'Full-range cabinet for a deeper room.', null],
                    ],
                ],
                'JLS Series' => [
                    'summary' => 'Line-source elements and subs for rooms where speech has to reach the back row.',
                    'products' => [
                        ['JLS 210', 'Compact line-source element.', null],
                        ['JLS 212', 'Longer-throw line-source element.', null],
                        ['JLS Sub 18', 'Subwoofer to sit under the array.', null],
                    ],
                ],
                'JDA Series' => [
                    'summary' => 'Stage monitors so the platform hears the same mix the room hears.',
                    'products' => [
                        ['JDA 12M', 'Low-profile wedge for a tight platform.', null],
                        ['JDA 15M', 'Louder wedge for a full band.', null],
                        ['JDA Side 12', 'Side fill for a wide stage.', null],
                    ],
                ],
                'JX Series' => [
                    'summary' => 'Amplifiers and processing that sit behind the JLA and JLS cabinets.',
                    'products' => [
                        ['JX Amp 4', 'Four-channel amplifier.', null],
                        ['JX Amp 8', 'Eight-channel amplifier for a larger system.', null],
                        ['JX Processor', 'System processor for tuning the room.', null],
                    ],
                ],
            ],
        ];

        $products = collect();

        foreach ($catalog as $categoryName => $seriesMap) {
            $category = Category::factory()->create([
                'name' => $categoryName,
                'slug' => str($categoryName)->slug()->toString(),
            ]);

            foreach ($seriesMap as $seriesName => $seriesData) {
                $series = Series::factory()->create([
                    'category_id' => $category->id,
                    'name' => $seriesName,
                    'slug' => str($seriesName)->slug()->toString(),
                    'summary' => $seriesData['summary'],
                ]);

                foreach ($seriesData['products'] as [$productName, $description, $refresh]) {
                    $products->push(Product::factory()->create([
                        'series_id' => $series->id,
                        'name' => $productName,
                        'slug' => str($productName)->slug()->toString(),
                        'description' => $description,
                        'refresh_hz' => $refresh,
                    ]));
                }
            }
        }

        foreach ([$client, $dealer, $sales, $admin] as $owner) {
            $quote = Quote::factory()->create([
                'user_id' => $owner->id,
                'name' => match ($owner->role) {
                    'client' => 'Sanctuary LED wall',
                    'dealer' => 'Dealer lighting package',
                    'sales' => 'Touring audio system',
                    default => 'Platform wash and wall',
                },
                'type' => 'quote',
                'status' => 'requested',
                'checkout_allowed' => $owner->role === 'client',
            ]);

            $lines = $products->random(3);
            $total = 0;

            foreach ($lines as $product) {
                $quantity = fake()->numberBetween(1, 6);
                QuoteItem::factory()->create([
                    'quote_id' => $quote->id,
                    'product_id' => $product->id,
                    'quantity' => $quantity,
                    'unit_price' => $owner->role === 'dealer' ? $product->dealer_price : $product->list_price,
                ]);
                $price = $owner->role === 'dealer' ? $product->dealer_price : $product->list_price;
                $total += $quantity * (float) $price;
            }

            $quote->update(['total' => round($total, 2)]);
        }
    }
}
