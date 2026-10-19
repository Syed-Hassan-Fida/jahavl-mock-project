# Read cache

Redis caches public catalog reads, trade catalog reads, catalog search, and workspace analytics. Quotes, payments, messages, tickets, notifications, and account data are read from the database on every request.

The default `CACHE_STORE` stays `database`. Read caching uses the named stores in `config/readcache.php`, so a Redis outage does not take down sessions or the framework cache.

## What is cached

| Data | Key | TTL | Invalidation |
| --- | --- | --- | --- |
| `GET /api/v1/catalog` | `catalog:{version}:index` | `CACHE_CATALOG_TTL` (300s) | Catalog version bump |
| Series and product pages | `catalog:{version}:series\|product:{slug}:{public\|trade}` | 300s | Catalog version bump |
| `GET /api/v1/catalog/search` | `catalog:{version}:search:{term}:{audience}` | `CACHE_SEARCH_TTL` (60s) | Catalog version bump, then TTL |
| `GET /api/v1/admin/analytics` | `analytics:{version}:{user id}` | `CACHE_ANALYTICS_TTL` (30s) | Analytics version bump on quote or line save/delete |
| API role lookup | `auth:role:{sha256(token)}` | `CACHE_AUTH_TTL` (60s) | Forgotten on login and logout |

Public and trade catalog entries are separate. Dealer net is stored only in the trade entry. A request with no token, or with a client token, never reads the trade entry.

Search text is trimmed and cut at 80 characters. A missing series or product is not stored, so a slug that starts resolving does not stay cached as a 404.

Values are plain arrays. Laravel refuses to restore arbitrary objects from Redis, and a cached Eloquent collection comes back empty.

## Invalidation

Each namespace has one integer version (`version:catalog`, `version:analytics`). Cache keys include that integer. A bump writes the next integer; the previous keys expire by TTL. Restarts do not need a flush for correctness.

The catalog version bumps when an admin updates a product or a spreadsheet import changes at least one row. Uploading a document does not bump it, because documents are not part of the public payload. The analytics version bumps from model events on `Quote` and `QuoteItem`.

Role cache entries are removed from both the Redis store and the database fallback when a token is replaced or cleared.

## Redis down

`ReadCache` tries Redis first. Connection settings are short on purpose: `REDIS_TIMEOUT` and `REDIS_READ_TIMEOUT` default to 0.3 seconds, and `REDIS_MAX_RETRIES` defaults to 1. A failed operation opens a circuit for `REDIS_CIRCUIT_SECONDS` (15). While it is open, that PHP process skips Redis and uses `CACHE_READ_FALLBACK` (`database`). The open state is also written to `storage/framework/redis-circuit` so the next request in the process does not pay the timeout again.

A closed port was measured at about 600ms for the first request (the timeout) and 1.2ms for the next request once the circuit was open. The computed value was served both times. Closing the circuit file, or waiting 15 seconds, sends traffic back to Redis.

Locks are taken around a cache fill so concurrent misses do not all run the query. If the lock cannot be acquired, the request waits 150ms and reads again, then computes if the value is still missing. A lock error follows the same fallback path.

## Environment

`phpredis` is the client (`REDIS_CLIENT=phpredis`). Predis is not installed. Redis DB 0 is the default connection. DB 1 (`REDIS_CACHE_DB`) is the cache.

```
CACHE_READ_STORE=redis
CACHE_READ_FALLBACK=database
CACHE_CATALOG_TTL=300
CACHE_SEARCH_TTL=60
CACHE_ANALYTICS_TTL=30
CACHE_AUTH_TTL=60
CACHE_VERSION_TTL=2592000
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_DB=0
REDIS_CACHE_DB=1
REDIS_TIMEOUT=0.3
REDIS_READ_TIMEOUT=0.3
REDIS_MAX_RETRIES=1
REDIS_PERSISTENT=false
REDIS_CIRCUIT_SECONDS=15
CACHE_LOCK_SECONDS=8
PERF_SLOW_MS=200
```

Tests force `CACHE_READ_STORE=array` and `CACHE_READ_FALLBACK=array`.

Set `REDIS_PERSISTENT=true` only under PHP-FPM, where a worker keeps the connection. Leave it false for `php artisan serve` and CLI commands.

## Observability

`app/Http/Middleware/RequestTiming.php` adds `Server-Timing: app;dur=...` on API responses. Requests slower than `PERF_SLOW_MS`, and any 5xx, are written to `storage/logs/perf.log` with method, path, status, and milliseconds. Query strings are not logged.

Catalog responses send `X-Cache: hit` or `X-Cache: miss`. Public catalog responses use `Cache-Control: no-cache, public`. Trade responses use `private, no-store`.

`GET /api/v1/admin/cache` is admin-only. It reports whether Redis answered, ping time, circuit state, hit/miss/fallback counters, and the catalog and analytics versions.

## Indexes

`2026_10_11_000003_add_read_indexes` adds:

- `products (is_published, series_id)`
- `quotes (user_id, status)`
- `quote_items (quote_id, parent_id)`

`slug` and `api_token` are already unique.

## Measured on this machine

Warm single requests against `127.0.0.1:8000` after a Redis hit:

- Catalog miss: about 148ms (`Server-Timing`)
- Catalog hit: 8–27ms
- Search miss: about 110ms client time, then 48ms on the following hit

Eight PHP built-in workers (`PHP_CLI_SERVER_WORKERS=8 php artisan serve --no-reload`), 100% cache hits, no errors:

| Load | Requests | Throughput | p50 | p95 |
| --- | --- | --- | --- | --- |
| 32 clients, 8 in flight | 32 | 109 req/s | 56ms | 105ms |
| 64 clients, 16 in flight | 64 | 114 req/s | 115ms | 220ms |
| 128 clients, 32 in flight | 128 | 91 req/s | 322ms | 432ms |
| Search, 64 clients, 16 in flight | 64 | 109 req/s | 129ms | 201ms |

Latency climbs once concurrency passes the worker count because requests wait for a free worker. After that run, `GET /api/v1/admin/cache` reported 298 hits, 8 misses, 0 fallbacks, and Redis used about 1.4MB.

The dev server must be started with `--no-reload` before it will honor `PHP_CLI_SERVER_WORKERS`. The normal reloading server is one process.

## Production shape

Run PHP-FPM or another multi-worker PHP, with MySQL or Postgres, and a shared Redis. This app still uses SQLite, which allows one writer. That is the write bottleneck and a single point of failure for quotes, messages, and payments. Point `DB_CONNECTION` at a server database before expecting write throughput to scale.

One Redis process is enough for this cache. It is not highly available. The circuit breaker is what keeps the API up when that process stops. For more than one app server, use one shared Redis (or Redis with replicas) and keep `REDIS_CACHE_DB` dedicated to cache keys.

The Next.js catalog fetch uses `revalidate: 30`. A catalog version bump is visible to the API immediately and to the public site within 30 seconds.

`GET /api/v1/catalog/search` uses `lower(name) LIKE '%term%'`. That cannot use the btree index. The catalog is small enough that a 60-second cache is the right fix. A full-text index belongs on a later database, not in this cache layer.

The catalog index loads published product names once per TTL to pick each series image. Replace that with a window query when the catalog is large enough that the extra rows matter.

Messages, tickets, and notifications stay request/response. Nothing in this cache pushes updates to a browser.
