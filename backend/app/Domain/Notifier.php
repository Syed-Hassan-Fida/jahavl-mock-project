<?php

namespace App\Domain;

use App\Models\Notification;
use App\Models\Quote;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class Notifier
{
    public static function toUser(int $userId, string $title, string $body): void
    {
        $notification = Notification::query()->create([
            'user_id' => $userId,
            'title' => $title,
            'body' => $body,
        ]);
        Live::toUser($userId, 'notification', [
            'notification' => [
                'id' => $notification->id,
                'title' => $notification->title,
                'body' => $notification->body,
                'read_at' => null,
            ],
        ]);
    }

    public static function toQuoteStaff(Quote $quote, string $title, string $body): void
    {
        $ids = [];
        if ($quote->sales_user_id) {
            $ids[] = $quote->sales_user_id;
        }
        $ids = array_merge(
            $ids,
            DB::table('sales_clients')->where('client_user_id', $quote->user_id)->pluck('sales_user_id')->all(),
        );
        if ($ids === []) {
            $ids = User::query()->where('role', 'admin')->pluck('id')->all();
        }

        foreach (array_unique(array_map('intval', $ids)) as $id) {
            self::toUser($id, $title, $body);
        }
    }

    public static function toAdmins(string $title, string $body): void
    {
        foreach (User::query()->where('role', 'admin')->pluck('id') as $id) {
            self::toUser((int) $id, $title, $body);
        }
    }
}
