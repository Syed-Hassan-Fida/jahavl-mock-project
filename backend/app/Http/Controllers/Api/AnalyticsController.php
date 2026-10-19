<?php

namespace App\Http\Controllers\Api;

use App\Domain\ReadCache;
use App\Http\Controllers\Controller;
use App\Models\Quote;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        if (! in_array($request->user()->role, ['admin', 'sales'], true)) {
            return response()->json(['message' => 'You do not have access to analytics.'], 403);
        }

        $version = ReadCache::version('analytics');
        $body = ReadCache::remember(
            'analytics:'.$version.':'.$request->user()->id,
            (int) config('readcache.analytics_ttl'),
            fn () => $this->build($request),
        );

        return response()->json($body)->header('X-Cache', ReadCache::outcome());
    }

    private function build(Request $request): array
    {
        $visible = Quote::query()->visibleTo($request->user());
        $ids = (clone $visible)->pluck('id');

        $byStatus = (clone $visible)
            ->select('status', DB::raw('count(*) as quotes'), DB::raw('sum(total) as pipeline'))
            ->groupBy('status')
            ->orderBy('status')
            ->get()
            ->map(fn ($row) => [
                'status' => $row->status,
                'quotes' => (int) $row->quotes,
                'pipeline' => (float) $row->pipeline,
            ])
            ->values()
            ->all();

        $byCategory = DB::table('quote_items')
            ->join('products', 'products.id', '=', 'quote_items.product_id')
            ->join('series', 'series.id', '=', 'products.series_id')
            ->join('categories', 'categories.id', '=', 'series.category_id')
            ->whereIn('quote_items.quote_id', $ids->all())
            ->whereNull('quote_items.parent_id')
            ->select('categories.name', DB::raw('sum(quote_items.quantity * quote_items.unit_price) as amount'))
            ->groupBy('categories.name')
            ->orderBy('categories.name')
            ->get()
            ->map(fn ($row) => [
                'name' => $row->name,
                'amount' => (float) $row->amount,
            ])
            ->values()
            ->all();

        return [
            'pipeline_total' => (float) (clone $visible)->where('status', '!=', 'paid')->sum('total'),
            'paid_total' => (float) (clone $visible)->where('status', 'paid')->sum('total'),
            'quote_count' => (clone $visible)->count(),
            'by_status' => $byStatus,
            'by_category' => $byCategory,
        ];
    }
}
