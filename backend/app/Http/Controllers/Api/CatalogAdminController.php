<?php

namespace App\Http\Controllers\Api;

use App\Domain\ReadCache;
use App\Domain\Spreadsheet;
use App\Domain\Uploads;
use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductDocument;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CatalogAdminController extends Controller
{
    public function index(Request $request)
    {
        $this->admin($request);
        $term = trim((string) $request->query('q', ''));
        $products = Product::query()
            ->with('series:id,name')
            ->when($term !== '', function ($query) use ($term) {
                $like = '%'.addcslashes(mb_strtolower($term), '%_\\').'%';
                $query->where(function ($inner) use ($like) {
                    $inner->whereRaw('lower(name) like ?', [$like])->orWhereRaw('lower(slug) like ?', [$like]);
                });
            })
            ->orderBy('name')
            ->limit(500)
            ->get();

        return response()->json([
            'products' => $products->map(fn (Product $product) => $this->row($product)),
        ]);
    }

    public function update(Request $request, Product $product)
    {
        $this->admin($request);
        $data = $request->validate([
            'list_price' => ['sometimes', 'numeric', 'min:0'],
            'dealer_price' => ['sometimes', 'numeric', 'min:0'],
            'cost' => ['sometimes', 'numeric', 'min:0'],
            'weight' => ['nullable', 'numeric', 'min:0'],
            'shipping_amount' => ['sometimes', 'numeric', 'min:0'],
            'tariff' => ['sometimes', 'numeric', 'min:0'],
            'markup_percent' => ['sometimes', 'numeric', 'min:0'],
            'dealer_markup_percent' => ['sometimes', 'numeric', 'min:0'],
            'featured' => ['sometimes', 'boolean'],
            'is_published' => ['sometimes', 'boolean'],
        ]);
        $product->update($data);
        ReadCache::bump('catalog');

        return response()->json(['product' => $this->row($product->fresh())]);
    }

    public function import(Request $request)
    {
        $this->admin($request);
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt,xlsx']]);
        $file = $request->file('file');
        $rows = Spreadsheet::rows($file->getRealPath(), $file->getClientOriginalExtension() ?: 'csv');
        $updated = 0;
        $skipped = 0;
        foreach ($rows as $row) {
            $product = null;
            if (! empty($row['slug'])) {
                $product = Product::query()->where('slug', $row['slug'])->first();
            } elseif (! empty($row['name'])) {
                $product = Product::query()->where('name', $row['name'])->first();
            }
            if (! $product) {
                $skipped++;
                continue;
            }
            $map = [
                'list_price' => 'list_price',
                'dealer_price' => 'dealer_price',
                'cost' => 'cost',
                'weight' => 'weight',
                'shipping' => 'shipping_amount',
                'shipping_amount' => 'shipping_amount',
                'tariff' => 'tariff',
                'markup' => 'markup_percent',
                'markup_percent' => 'markup_percent',
                'dealer_markup' => 'dealer_markup_percent',
                'dealer_markup_percent' => 'dealer_markup_percent',
                'featured' => 'featured',
            ];
            $changes = [];
            foreach ($map as $column => $attribute) {
                if (! array_key_exists($column, $row) || $row[$column] === '') {
                    continue;
                }
                $changes[$attribute] = $attribute === 'featured'
                    ? in_array(strtolower($row[$column]), ['1', 'true', 'yes'], true)
                    : $row[$column];
            }
            if ($changes !== []) {
                $product->update($changes);
                $updated++;
            }
        }

        if ($updated > 0) {
            ReadCache::bump('catalog');
        }

        return response()->json(['updated' => $updated, 'skipped' => $skipped]);
    }

    public function destroy(Request $request, Product $product)
    {
        $this->admin($request);
        if ($product->quoteItems()->exists()) {
            abort(422, 'This product is on a quote. Unpublish it instead of deleting it.');
        }
        $product->documents()->delete();
        $product->delete();
        ReadCache::bump('catalog');

        return response()->json(['message' => 'Product removed.']);
    }

    public function destroyImage(Request $request, Product $product)
    {
        $this->admin($request);
        $product->update(['image' => null]);
        ReadCache::bump('catalog');

        return response()->json(['message' => 'Product image removed.']);
    }

    public function storeDocument(Request $request, Product $product)
    {
        $this->admin($request);
        $data = $request->validate([
            'name' => ['nullable', 'string', 'max:160'],
            'file' => ['required', 'file'],
        ]);
        $path = Uploads::store($request->file('file'), 'documents');
        $document = $product->documents()->create([
            'name' => $data['name'] ?? $request->file('file')->getClientOriginalName(),
            'path' => $path,
        ]);

        return response()->json(['document' => ['id' => $document->id, 'name' => $document->name]], 201);
    }

    public function publicDocument(ProductDocument $document)
    {
        $document->load('product');
        if (! $document->product?->is_published || ! Storage::disk('local')->exists($document->path)) {
            abort(404);
        }

        return Storage::disk('local')->download($document->path, Str::slug($document->name).'.'.pathinfo($document->path, PATHINFO_EXTENSION));
    }

    public function downloadDocument(Request $request, ProductDocument $document)
    {
        if (! $request->user()) {
            abort(401);
        }
        if (! Storage::disk('local')->exists($document->path)) {
            abort(404);
        }

        return Storage::disk('local')->download($document->path, Str::slug($document->name).'.'.pathinfo($document->path, PATHINFO_EXTENSION));
    }

    private function row(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'series' => $product->series?->name,
            'list_price' => $product->list_price,
            'dealer_price' => $product->dealer_price,
            'cost' => $product->cost,
            'weight' => $product->weight,
            'shipping_amount' => $product->shipping_amount,
            'tariff' => $product->tariff,
            'markup_percent' => $product->markup_percent,
            'dealer_markup_percent' => $product->dealer_markup_percent,
            'featured' => $product->featured,
            'is_published' => $product->is_published,
            'image' => $product->image,
            'documents' => $product->documents()->get(['id', 'name']),
        ];
    }

    private function admin(Request $request): void
    {
        if ($request->user()->role !== 'admin') {
            abort(403, 'Catalog pricing is limited to admin.');
        }
    }
}
