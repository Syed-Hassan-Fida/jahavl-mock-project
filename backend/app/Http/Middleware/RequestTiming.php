<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;
use Throwable;

class RequestTiming
{
    public function handle(Request $request, Closure $next): Response
    {
        $started = hrtime(true);

        try {
            $response = $next($request);
        } catch (Throwable $e) {
            $this->record($request, $started, 500);
            throw $e;
        }

        $this->record($request, $started, $response->getStatusCode(), $response);

        return $response;
    }

    private function record(Request $request, int $started, int $status, ?Response $response = null): void
    {
        $ms = (hrtime(true) - $started) / 1_000_000;
        if ($response) {
            $response->headers->set('Server-Timing', 'app;dur='.round($ms, 1));
        }
        if ($ms < (int) config('readcache.slow_ms') && $status < 500) {
            return;
        }

        Log::channel('perf')->info('http.slow', [
            'method' => $request->method(),
            'path' => '/'.$request->path(),
            'status' => $status,
            'ms' => round($ms, 1),
        ]);
    }
}
