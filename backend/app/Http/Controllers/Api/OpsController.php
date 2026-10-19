<?php

namespace App\Http\Controllers\Api;

use App\Domain\ReadCache;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Throwable;

class OpsController extends Controller
{
    public function cache(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'You do not have access to cache metrics.'], 403);
        }

        $ping = null;
        $redis = false;
        if (config('readcache.primary') === 'redis') {
            try {
                $started = hrtime(true);
                Cache::store('redis')->get('ops:ping');
                $ping = round((hrtime(true) - $started) / 1_000_000, 2);
                $redis = true;
            } catch (Throwable) {
                $redis = false;
            }
        }

        return response()->json([
            'redis' => $redis,
            'redis_ping_ms' => $ping,
            ...ReadCache::snapshot(),
        ]);
    }
}
