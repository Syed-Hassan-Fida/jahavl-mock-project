<?php

namespace Tests\Feature;

use App\Domain\ReadCache;
use App\Models\Category;
use App\Models\Product;
use App\Models\Quote;
use App\Models\Series;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use ReflectionProperty;
use Tests\TestCase;

class ReadCacheTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        ReadCache::flushState();
    }

    public function test_catalog_is_served_from_cache_on_the_second_request(): void
    {
        $this->catalog();

        $this->getJson('/api/v1/catalog')->assertOk()->assertHeader('X-Cache', 'miss');

        DB::flushQueryLog();
        DB::enableQueryLog();
        $second = $this->getJson('/api/v1/catalog');

        $second->assertOk()->assertHeader('X-Cache', 'hit');
        $this->assertIsList($second->json('categories'));
        $this->assertCount(0, DB::getQueryLog());
        $this->assertCachedValuesArePlain();
    }

    public function test_price_change_invalidates_the_catalog(): void
    {
        [$product, $admin, $token] = $this->catalog(true);

        $this->getJson('/api/v1/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('product.list_price', '1000.00');

        $this->withToken($token)
            ->patchJson('/api/v1/admin/products/'.$product->id, ['list_price' => 2222])
            ->assertOk();

        $this->getJson('/api/v1/products/'.$product->slug)
            ->assertOk()
            ->assertHeader('X-Cache', 'miss')
            ->assertJsonPath('product.list_price', '2222.00');
    }

    public function test_dealer_price_stays_out_of_the_public_cache(): void
    {
        [$product] = $this->catalog();
        $dealer = User::factory()->role('dealer')->create();
        $token = $this->token($dealer);

        $this->getJson('/api/v1/products/'.$product->slug)
            ->assertOk()
            ->assertJsonMissingPath('product.dealer_price');

        $this->withToken($token)
            ->getJson('/api/v1/products/'.$product->slug)
            ->assertOk()
            ->assertJsonPath('product.dealer_price', '800.00');
    }

    public function test_analytics_reflects_a_quote_saved_after_the_cache_was_warm(): void
    {
        $admin = User::factory()->role('admin')->create();
        $token = $this->token($admin);
        Quote::factory()->create(['total' => 10, 'status' => 'added']);

        $first = $this->withToken($token)->getJson('/api/v1/admin/analytics')->assertOk();

        Quote::factory()->create(['total' => 20, 'status' => 'requested']);

        $second = $this->withToken($token)->getJson('/api/v1/admin/analytics')->assertOk();
        $this->assertSame($first->json('quote_count') + 1, $second->json('quote_count'));
    }

    public function test_cache_metrics_are_admin_only(): void
    {
        $client = User::factory()->role('client')->create();
        $admin = User::factory()->role('admin')->create();

        $this->withToken($this->token($client))
            ->getJson('/api/v1/admin/cache')
            ->assertForbidden();

        $this->withToken($this->token($admin))
            ->getJson('/api/v1/admin/cache')
            ->assertOk()
            ->assertJsonStructure(['store', 'circuit_open', 'hits', 'misses', 'catalog_version']);
    }

    private function assertCachedValuesArePlain(): void
    {
        $store = Cache::store('array')->getStore();
        $storage = (new ReflectionProperty($store, 'storage'))->getValue($store);

        foreach ($storage as $item) {
            $restored = unserialize(serialize($item['value']), ['allowed_classes' => false]);
            $this->assertSame(json_encode($item['value']), json_encode($restored));
        }
    }

    /**
     * @return array{0: Product, 1?: User, 2?: string}
     */
    private function catalog(bool $withAdmin = false): array
    {
        $category = Category::factory()->create();
        $series = Series::factory()->create(['category_id' => $category->id]);
        $product = Product::factory()->create([
            'series_id' => $series->id,
            'list_price' => 1000,
            'dealer_price' => 800,
            'is_published' => true,
        ]);

        if (! $withAdmin) {
            return [$product];
        }

        $admin = User::factory()->role('admin')->create();

        return [$product, $admin, $this->token($admin)];
    }

    private function token(User $user): string
    {
        $plain = Str::random(64);
        $user->forceFill(['api_token' => hash('sha256', $plain)])->save();

        return $plain;
    }
}
