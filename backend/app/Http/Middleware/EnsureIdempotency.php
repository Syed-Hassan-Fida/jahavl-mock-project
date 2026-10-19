<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyKey;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\Response;

class EnsureIdempotency
{
    public function handle(Request $request, Closure $next): Response
    {
        $key = trim((string) $request->header('Idempotency-Key', ''));
        if ($key === '') {
            return response()->json([
                'message' => 'Send an Idempotency-Key header so a retry cannot create a second record.',
            ], 422);
        }
        if (! preg_match('/^[A-Za-z0-9][A-Za-z0-9._:-]{7,79}$/', $key)) {
            return response()->json([
                'message' => 'Idempotency-Key must be 8 to 80 letters, numbers, dots, underscores, colons, or hyphens.',
            ], 422);
        }

        $hash = hash('sha256', $request->method.' '.$request->path().' '.$this->fingerprint($request));

        if (DB::getDriverName() === 'sqlite') {
            DB::statement('PRAGMA busy_timeout = 5000');
        }

        return DB::transaction(function () use ($request, $next, $key, $hash) {
            IdempotencyKey::query()
                ->where('user_id', $request->user()->id)
                ->where('created_at', '<', now()->subDay())
                ->delete();

            $existing = IdempotencyKey::query()
                ->where('user_id', $request->user()->id)
                ->where('key', $key)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                if (! hash_equals($existing->request_hash, $hash)) {
                    return response()->json([
                        'message' => 'This idempotency key was already used for a different request.',
                    ], 409);
                }

                return response()->json($existing->body, $existing->status_code);
            }

            /** @var Response $response */
            $response = $next($request);
            if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300) {
                IdempotencyKey::query()->create([
                    'user_id' => $request->user()->id,
                    'key' => $key,
                    'request_hash' => $hash,
                    'status_code' => $response->getStatusCode(),
                    'body' => json_decode($response->getContent(), true) ?? [],
                ]);
            }

            return $response;
        });
    }

    private function fingerprint(Request $request): string
    {
        $data = $request->except(['file']);
        $this->sort($data);

        return json_encode($data, JSON_THROW_ON_ERROR);
    }

    private function sort(array &$data): void
    {
        foreach ($data as &$value) {
            if (is_array($value)) {
                $this->sort($value);
            }
        }
        ksort($data);
    }
}
