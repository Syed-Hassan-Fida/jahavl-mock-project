<?php

namespace Tests\Unit;

use App\Domain\ReadCache;
use Illuminate\Cache\ArrayStore;
use Illuminate\Support\Facades\Cache;
use RuntimeException;
use stdClass;
use Tests\TestCase;

class ReadCacheFallbackTest extends TestCase
{
    public function test_a_down_primary_store_falls_back_and_the_circuit_skips_it(): void
    {
        $counter = new stdClass;
        $counter->reads = 0;

        config([
            'cache.stores.explode' => ['driver' => 'explode'],
            'readcache.primary' => 'explode',
            'readcache.fallback' => 'array',
            'readcache.circuit_seconds' => 30,
        ]);

        Cache::extend('explode', function () use ($counter) {
            return Cache::repository(new class($counter) extends ArrayStore
            {
                public function __construct(private stdClass $counter)
                {
                    parent::__construct();
                }

                public function get($key)
                {
                    $this->counter->reads++;
                    throw new RuntimeException('connection refused');
                }

                public function put($key, $value, $seconds)
                {
                    throw new RuntimeException('connection refused');
                }
            });
        });

        ReadCache::flushState();

        $first = ReadCache::remember('sample', 60, fn () => ['ok' => true]);
        $this->assertSame(['ok' => true], $first);
        $this->assertTrue(ReadCache::snapshot()['circuit_open']);
        $afterFailure = $counter->reads;
        $this->assertGreaterThan(0, $afterFailure);

        $second = ReadCache::remember('sample', 60, fn () => ['ok' => false]);
        $this->assertSame(['ok' => true], $second);
        $this->assertSame($afterFailure, $counter->reads);
        ReadCache::flushState();
    }
}
