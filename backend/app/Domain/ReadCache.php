<?php

namespace App\Domain;

use App\Models\User;
use Illuminate\Contracts\Cache\Repository;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Throwable;

class ReadCache
{
    private static string $outcome = 'miss';

    private static ?int $circuitUntil = null;

    public static function outcome(): string
    {
        return self::$outcome;
    }

    public static function flushState(): void
    {
        self::$circuitUntil = 0;
        self::$outcome = 'miss';
        @unlink(storage_path('framework/redis-circuit'));
    }

    public static function remember(string $key, int $ttl, callable $callback): mixed
    {
        $store = self::repository();
        $hit = self::read($store, $key);
        if ($hit['found']) {
            self::$outcome = 'hit';
            self::count($store, 'hit');

            return $hit['value'];
        }

        $lock = null;
        $acquired = false;
        try {
            $lock = $store->lock($key.':lock', (int) config('readcache.lock_seconds'));
            $acquired = $lock->get();
        } catch (Throwable $e) {
            $store = self::fail($e);
        }

        if ($acquired && $lock) {
            try {
                $again = self::read($store, $key);
                if ($again['found']) {
                    self::$outcome = 'hit';
                    self::count($store, 'hit');

                    return $again['value'];
                }
                self::$outcome = 'miss';
                self::count($store, 'miss');
                $value = $callback();
                if ($value !== null) {
                    self::write($store, $key, $value, $ttl);
                }

                return $value;
            } finally {
                try {
                    $lock->release();
                } catch (Throwable) {
                }
            }
        }

        usleep((int) config('readcache.lock_wait_us'));
        $waited = self::read(self::repository(), $key);
        if ($waited['found']) {
            self::$outcome = 'hit';
            self::count(self::repository(), 'hit');

            return $waited['value'];
        }

        self::$outcome = 'miss';
        self::count(self::repository(), 'miss');
        $value = $callback();
        if ($value !== null) {
            self::write(self::repository(), $key, $value, $ttl);
        }

        return $value;
    }

    public static function version(string $name): int
    {
        $key = 'version:'.$name;
        $store = self::repository();
        $current = self::read($store, $key);
        if ($current['found'] && is_numeric($current['value'])) {
            return (int) $current['value'];
        }

        $fresh = time();
        self::write($store, $key, $fresh, (int) config('readcache.version_ttl'));
        $stored = self::read(self::repository(), $key);

        return ($stored['found'] && is_numeric($stored['value'])) ? (int) $stored['value'] : $fresh;
    }

    public static function bump(string $name): void
    {
        $next = self::version($name) + 1;
        self::write(self::repository(), 'version:'.$name, $next, (int) config('readcache.version_ttl'));
        Log::channel('perf')->info('cache.invalidate', ['namespace' => $name, 'version' => $next]);
    }

    public static function roleForToken(string $plain): ?string
    {
        $hash = hash('sha256', $plain);
        $cached = self::remember('auth:role:'.$hash, (int) config('readcache.auth_ttl'), function () use ($hash) {
            return ['role' => User::query()->where('api_token', $hash)->value('role')];
        });

        return is_array($cached) ? ($cached['role'] ?? null) : null;
    }

    public static function forgetRoleHash(?string $hash): void
    {
        if (! $hash) {
            return;
        }
        foreach (array_unique([self::primaryName(), self::fallbackName()]) as $name) {
            try {
                Cache::store($name)->forget('auth:role:'.$hash);
            } catch (Throwable) {
            }
        }
    }

    public static function circuitOpen(): bool
    {
        $until = self::$circuitUntil;
        if ($until === null) {
            $path = self::circuitPath();
            $until = is_file($path) ? (int) file_get_contents($path) : 0;
            self::$circuitUntil = $until;
        }

        return $until > time();
    }

    /**
     * @return array{store: string, circuit_open: bool, hits: int, misses: int, fallbacks: int, catalog_version: int, analytics_version: int}
     */
    public static function snapshot(): array
    {
        return [
            'store' => self::circuitOpen() ? self::fallbackName() : self::primaryName(),
            'circuit_open' => self::circuitOpen(),
            'hits' => self::readMetric('hit'),
            'misses' => self::readMetric('miss'),
            'fallbacks' => self::readMetric('fallback'),
            'catalog_version' => self::version('catalog'),
            'analytics_version' => self::version('analytics'),
        ];
    }

    private static function repository(): Repository
    {
        if (self::circuitOpen() || self::primaryName() === self::fallbackName()) {
            return Cache::store(self::fallbackName());
        }

        return Cache::store(self::primaryName());
    }

    /**
     * @return array{found: bool, value: mixed}
     */
    private static function read(Repository $store, string $key, bool $allowFallback = true): array
    {
        try {
            $wrapped = $store->get($key);
        } catch (Throwable $e) {
            if (! $allowFallback) {
                return ['found' => false, 'value' => null];
            }
            $fallback = self::fail($e);

            return self::read($fallback, $key, false);
        }

        if (! is_array($wrapped) || ! array_key_exists('payload', $wrapped)) {
            return ['found' => false, 'value' => null];
        }

        return ['found' => true, 'value' => $wrapped['payload']];
    }

    private static function write(Repository $store, string $key, mixed $value, int $ttl, bool $allowFallback = true): void
    {
        try {
            $store->put($key, ['payload' => $value], $ttl);
        } catch (Throwable $e) {
            if (! $allowFallback) {
                return;
            }
            self::write(self::fail($e), $key, $value, $ttl, false);
        }
    }

    private static function count(Repository $store, string $name): void
    {
        try {
            $store->increment('metrics:'.$name);
        } catch (Throwable) {
        }
    }

    private static function readMetric(string $name): int
    {
        try {
            return (int) self::repository()->increment('metrics:'.$name, 0);
        } catch (Throwable) {
            return 0;
        }
    }

    private static function fail(Throwable $e): Repository
    {
        $until = time() + (int) config('readcache.circuit_seconds');
        self::$circuitUntil = $until;
        $path = self::circuitPath();
        if (! is_dir(dirname($path))) {
            @mkdir(dirname($path), 0775, true);
        }
        @file_put_contents($path, (string) $until);
        Log::channel('perf')->warning('cache.circuit_open', ['error' => $e->getMessage()]);
        $fallback = Cache::store(self::fallbackName());
        self::count($fallback, 'fallback');

        return $fallback;
    }

    private static function primaryName(): string
    {
        return (string) config('readcache.primary');
    }

    private static function fallbackName(): string
    {
        return (string) config('readcache.fallback');
    }

    private static function circuitPath(): string
    {
        return storage_path('framework/redis-circuit');
    }
}
