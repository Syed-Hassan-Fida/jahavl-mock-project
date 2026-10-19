<?php

namespace App\Domain;

use App\Models\LiveEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;
use Throwable;

class Live
{
    /**
     * @param  list<int>  $userIds
     * @param  array<string, mixed>  $payload
     */
    public static function toUsers(array $userIds, string $name, array $payload): void
    {
        foreach (array_unique(array_map('intval', $userIds)) as $userId) {
            if ($userId > 0) {
                self::toUser($userId, $name, $payload);
            }
        }
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public static function toUser(int $userId, string $name, array $payload): void
    {
        $event = LiveEvent::query()->create([
            'user_id' => $userId,
            'name' => $name,
            'payload' => $payload,
        ]);

        if ($event->id % 25 === 0) {
            LiveEvent::query()
                ->where('user_id', $userId)
                ->where('created_at', '<', now()->subDays(2))
                ->delete();
        }

        $body = json_encode([
            'id' => $event->id,
            'name' => $name,
            'payload' => $payload,
        ]);

        DB::afterCommit(function () use ($userId, $body) {
            try {
                Redis::connection()->rpush('live:user:'.$userId, $body);
                Redis::connection()->expire('live:user:'.$userId, 120);
            } catch (Throwable) {
                // The row is already stored. The stream reads it on the next poll.
            }
        });
    }
}
