<?php

return [

    'primary' => env('CACHE_READ_STORE', 'redis'),

    'fallback' => env('CACHE_READ_FALLBACK', 'database'),

    'catalog_ttl' => (int) env('CACHE_CATALOG_TTL', 300),

    'search_ttl' => (int) env('CACHE_SEARCH_TTL', 60),

    'analytics_ttl' => (int) env('CACHE_ANALYTICS_TTL', 30),

    'auth_ttl' => (int) env('CACHE_AUTH_TTL', 60),

    'version_ttl' => (int) env('CACHE_VERSION_TTL', 60 * 60 * 24 * 30),

    'circuit_seconds' => (int) env('REDIS_CIRCUIT_SECONDS', 15),

    'lock_seconds' => (int) env('CACHE_LOCK_SECONDS', 8),

    'lock_wait_us' => (int) env('CACHE_LOCK_WAIT_US', 150000),

    'slow_ms' => (int) env('PERF_SLOW_MS', 200),

];
