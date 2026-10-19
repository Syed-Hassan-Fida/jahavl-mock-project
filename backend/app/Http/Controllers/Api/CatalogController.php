<?php

namespace App\Http\Controllers\Api;

use App\Domain\ReadCache;
use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Product;
use App\Models\Quote;
use App\Models\Series;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CatalogController extends Controller
{
    public function index(): JsonResponse
    {
        $version = ReadCache::version('catalog');
        $body = ReadCache::remember('catalog:'.$version.':index', (int) config('readcache.catalog_ttl'), function () {
            $categories = Category::query()
                ->with(['series' => fn ($query) => $query
                    ->withCount(['products' => fn ($products) => $products->where('is_published', true)])
                    ->orderBy('name')])
                ->orderBy('name')
                ->get();

            $seriesIds = $categories->flatMap(fn (Category $category) => $category->series->pluck('id'));
            $images = Product::query()
                ->where('is_published', true)
                ->whereIn('series_id', $seriesIds)
                ->orderBy('name')
                ->get(['series_id', 'image', 'name'])
                ->unique('series_id')
                ->pluck('image', 'series_id');

            return [
                'categories' => $categories->map(fn (Category $category) => [
                    'name' => $category->name,
                    'slug' => $category->slug,
                    'series' => $category->series->map(fn (Series $series) => [
                        'name' => $series->name,
                        'slug' => $series->slug,
                        'summary' => $series->summary,
                        'product_count' => $series->products_count,
                        'image' => $images[$series->id] ?? null,
                    ])->values()->all(),
                ])->values()->all(),
            ];
        });

        return $this->cached($body, 'public');
    }

    public function series(string $slug, Request $request): JsonResponse
    {
        $audience = $this->audience($request);
        $version = ReadCache::version('catalog');
        $key = 'catalog:'.$version.':series:'.sha1($slug).':'.$audience;
        $body = ReadCache::remember($key, (int) config('readcache.catalog_ttl'), function () use ($slug, $audience) {
            $series = Series::query()->where('slug', $slug)->with('category')->first();
            if (! $series) {
                return null;
            }

            $products = $series->products()->where('is_published', true)->orderBy('name')->get();

            return [
                'series' => [
                    'name' => $series->name,
                    'slug' => $series->slug,
                    'summary' => $series->summary,
                    'category' => [
                        'name' => $series->category->name,
                        'slug' => $series->category->slug,
                    ],
                    'products' => $products->map(fn (Product $product) => $this->productPayload($product, $audience))->values()->all(),
                ],
            ];
        });

        if ($body === null) {
            abort(404);
        }

        return $this->cached($body, $audience);
    }

    public function product(string $slug, Request $request): JsonResponse
    {
        $audience = $this->audience($request);
        $version = ReadCache::version('catalog');
        $key = 'catalog:'.$version.':product:'.sha1($slug).':'.$audience;
        $body = ReadCache::remember($key, (int) config('readcache.catalog_ttl'), function () use ($slug, $audience) {
            $product = Product::query()
                ->where('slug', $slug)
                ->where('is_published', true)
                ->with('series.category')
                ->first();
            if (! $product) {
                return null;
            }

            return ['product' => $this->productPayload($product, $audience, true)];
        });

        if ($body === null) {
            abort(404);
        }

        return $this->cached($body, $audience);
    }

    public function search(Request $request): JsonResponse
    {
        $term = mb_substr(mb_strtolower(trim((string) $request->query('q', ''))), 0, 80);
        $audience = $this->audience($request);
        $version = ReadCache::version('catalog');
        $key = 'catalog:'.$version.':search:'.sha1($term).':'.$audience;
        $body = ReadCache::remember($key, (int) config('readcache.search_ttl'), function () use ($term, $audience) {
            $products = Product::query()
                ->where('is_published', true)
                ->when($term !== '', fn ($query) => $query->whereRaw('lower(name) like ?', ['%'.$term.'%']))
                ->orderBy('name')
                ->limit(20)
                ->get();

            return [
                'products' => $products->map(fn (Product $product) => $this->productPayload($product, $audience))->values()->all(),
            ];
        });

        return $this->cached($body, $audience);
    }

    public function workspace(Request $request): JsonResponse
    {
        $term = mb_substr(mb_strtolower(trim((string) $request->query('q', ''))), 0, 80);
        if (mb_strlen($term) < 2) {
            return response()->json(['results' => []]);
        }

        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term);
        $contains = '%'.$escaped.'%';
        $prefix = $escaped.'%';
        $word = '% '.$escaped.'%';
        $rank = "case when lower(name) = ? then 0 when lower(name) like ? escape '\\' then 1 when lower(name) like ? escape '\\' then 2 else 3 end";

        $products = Product::query()
            ->where('is_published', true)
            ->where(function ($query) use ($contains) {
                $query->whereRaw("lower(name) like ? escape '\\'", [$contains])
                    ->orWhereRaw("lower(slug) like ? escape '\\'", [$contains]);
            })
            ->orderByRaw($rank, [$term, $prefix, $word])
            ->orderBy('name')
            ->limit(6)
            ->get(['id', 'name', 'slug']);

        $quotes = Quote::query()
            ->visibleTo($request->user())
            ->whereRaw("lower(name) like ? escape '\\'", [$contains])
            ->orderByRaw($rank, [$term, $prefix, $word])
            ->latest('id')
            ->limit(6)
            ->get(['id', 'name', 'status', 'type']);

        return response()->json([
            'results' => [
                ...$products->map(fn (Product $product) => [
                    'kind' => 'product',
                    'label' => $product->name,
                    'href' => '/products/'.$product->slug,
                ])->all(),
                ...$quotes->map(fn (Quote $quote) => [
                    'kind' => $quote->type === 'wishlist' ? 'wishlist' : 'quote',
                    'label' => $quote->name,
                    'href' => '/quotes/'.$quote->id,
                    'meta' => $quote->status,
                ])->all(),
            ],
        ]);
    }

    private function audience(Request $request): string
    {
        $plain = $request->bearerToken();
        if (! $plain) {
            return 'public';
        }

        $role = ReadCache::roleForToken($plain);

        return in_array($role, ['admin', 'sales', 'dealer'], true) ? 'trade' : 'public';
    }

    private function cached(array $body, string $audience): JsonResponse
    {
        $response = response()->json($body);
        $response->headers->set('X-Cache', ReadCache::outcome());
        if ($audience === 'public') {
            $response->setPublic();
            $response->headers->addCacheControlDirective('no-cache');
        } else {
            $response->setPrivate();
            $response->headers->addCacheControlDirective('no-store');
        }

        return $response;
    }

    public function resources(): JsonResponse
    {
        $products = Product::query()
            ->where('is_published', true)
            ->with(['series:id,name,slug', 'documents:id,product_id,name'])
            ->orderBy('name')
            ->get();

        return response()->json([
            'products' => $products->map(fn (Product $product) => [
                'name' => $product->name,
                'slug' => $product->slug,
                'image' => $product->image,
                'series' => $product->series?->name,
                'documents' => $product->documents->map(fn ($document) => [
                    'id' => $document->id,
                    'name' => $document->name,
                ]),
            ]),
        ]);
    }

    private function productPayload(Product $product, string $audience, bool $detailed = false): array
    {
        $payload = [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'list_price' => $product->list_price,
            'refresh_hz' => $product->refresh_hz,
            'image' => $product->image,
            'pitch' => $product->pitch,
            'brightness' => $product->brightness,
            'featured' => (bool) $product->featured,
        ];

        if ($audience === 'trade') {
            $payload['dealer_price'] = $product->dealer_price;
        }

        if ($detailed) {
            $payload['description'] = $product->description;
            $payload['specs'] = $product->specs ?? [];
            $payload['series'] = [
                'name' => $product->series->name,
                'slug' => $product->series->slug,
            ];
            $payload['category'] = [
                'name' => $product->series->category->name,
                'slug' => $product->series->category->slug,
            ];
        }

        return $payload;
    }
}
