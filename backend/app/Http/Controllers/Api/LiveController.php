<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LiveEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redis;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class LiveController extends Controller
{
    public function events(Request $request)
    {
        $after = max(0, (int) $request->query('after', 0));
        $rows = LiveEvent::query()
            ->where('user_id', $request->user()->id)
            ->where('id', '>', $after)
            ->orderBy('id')
            ->limit(100)
            ->get(['id', 'name', 'payload', 'created_at']);

        return response()->json(['events' => $rows]);
    }

    public function stream(Request $request): StreamedResponse
    {
        $after = max(0, (int) $request->query('after', 0));
        $userId = $request->user()->id;

        return response()->stream(function () use ($after, $userId) {
            @ini_set('zlib.output_compression', '0');
            while (ob_get_level() > 0) {
                ob_end_flush();
            }

            $last = $after;
            $deadline = time() + 25;
            echo ": connected\n\n";
            flush();

            while (time() < $deadline && connection_status() === CONNECTION_NORMAL) {
                $last = $this->emit($userId, $last);
                $this->wait($userId);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-store',
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function emit(int $userId, int $last): int
    {
        $rows = LiveEvent::query()
            ->where('user_id', $userId)
            ->where('id', '>', $last)
            ->orderBy('id')
            ->limit(50)
            ->get();

        foreach ($rows as $row) {
            echo 'id: '.$row->id."\n";
            echo 'data: '.json_encode([
                'id' => $row->id,
                'name' => $row->name,
                'payload' => $row->payload,
            ])."\n\n";
            $last = $row->id;
        }

        if ($rows->isNotEmpty()) {
            flush();
        }

        return $last;
    }

    private function wait(int $userId): void
    {
        try {
            Redis::connection('live')->blpop(['live:user:'.$userId], 1);
        } catch (Throwable) {
            usleep(500000);
        }
    }
}
