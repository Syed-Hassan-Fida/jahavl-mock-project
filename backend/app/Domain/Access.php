<?php

namespace App\Domain;

use App\Models\Quote;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class Access
{
    public static function constrainQuotes(Builder $query, User $user): void
    {
        if ($user->role === 'admin') {
            return;
        }

        if ($user->role === 'sales') {
            $clients = DB::table('sales_clients')->where('sales_user_id', $user->id)->pluck('client_user_id');
            $dealers = DB::table('sales_dealers')->where('sales_user_id', $user->id)->pluck('dealer_user_id');
            $query->where(function (Builder $inner) use ($user, $clients, $dealers) {
                $inner->where('user_id', $user->id)
                    ->orWhere('sales_user_id', $user->id)
                    ->orWhere('assigned_user_id', $user->id)
                    ->orWhereIn('user_id', $clients)
                    ->orWhereIn('user_id', $dealers)
                    ->orWhereIn('dealer_user_id', $dealers);
            });

            return;
        }

        if ($user->role === 'dealer') {
            $clients = DB::table('dealer_clients')->where('dealer_user_id', $user->id)->pluck('client_user_id');
            $query->where(function (Builder $inner) use ($user, $clients) {
                $inner->where('user_id', $user->id)
                    ->orWhere('dealer_user_id', $user->id)
                    ->orWhere('assigned_user_id', $user->id)
                    ->orWhereIn('user_id', $clients);
            });

            return;
        }

        $query->where(function (Builder $inner) use ($user) {
            $inner->where('user_id', $user->id)->orWhere('assigned_user_id', $user->id);
        });
    }

    public static function canSeeQuote(User $user, Quote $quote): bool
    {
        return Quote::query()->visibleTo($user)->whereKey($quote->id)->exists();
    }

    public static function canSeeUser(User $actor, User $subject): bool
    {
        if ($actor->id === $subject->id || $actor->role === 'admin') {
            return true;
        }

        if ($actor->role === 'sales') {
            return DB::table('sales_clients')->where('sales_user_id', $actor->id)->where('client_user_id', $subject->id)->exists()
                || DB::table('sales_dealers')->where('sales_user_id', $actor->id)->where('dealer_user_id', $subject->id)->exists();
        }

        if ($actor->role === 'dealer') {
            return DB::table('dealer_clients')->where('dealer_user_id', $actor->id)->where('client_user_id', $subject->id)->exists();
        }

        return false;
    }

    /** @return list<int> */
    public static function messageContactIds(User $user): array
    {
        if ($user->role === 'admin') {
            return User::query()->where('id', '!=', $user->id)->limit(200)->pluck('id')->all();
        }

        $ids = User::query()->where('role', 'admin')->pluck('id')->all();

        if ($user->role === 'sales') {
            $ids = array_merge(
                $ids,
                DB::table('sales_clients')->where('sales_user_id', $user->id)->pluck('client_user_id')->all(),
                DB::table('sales_dealers')->where('sales_user_id', $user->id)->pluck('dealer_user_id')->all(),
            );
        } elseif ($user->role === 'dealer') {
            $ids = array_merge(
                $ids,
                DB::table('dealer_clients')->where('dealer_user_id', $user->id)->pluck('client_user_id')->all(),
                DB::table('sales_dealers')->where('dealer_user_id', $user->id)->pluck('sales_user_id')->all(),
            );
        } else {
            $ids = array_merge(
                $ids,
                DB::table('sales_clients')->where('client_user_id', $user->id)->pluck('sales_user_id')->all(),
                DB::table('dealer_clients')->where('client_user_id', $user->id)->pluck('dealer_user_id')->all(),
            );
        }

        return array_values(array_unique(array_map('intval', $ids)));
    }

    public static function abilities(User $user, Quote $quote): array
    {
        $staff = in_array($user->role, ['admin', 'sales'], true);
        $ownerSide = in_array($user->id, array_filter([
            $quote->user_id,
            $quote->assigned_user_id,
            $quote->dealer_user_id,
        ]), true);
        $open = in_array($quote->status, ['added', 'rejected'], true);

        return [
            'edit' => $quote->status !== 'paid' && ($staff || ($open && $ownerSide)),
            'submit' => $quote->type === 'quote' && $quote->status === 'added' && $ownerSide,
            'revise' => in_array($quote->status, ['rejected', 'expired'], true) && $ownerSide,
            'expire' => $staff && ! in_array($quote->status, ['paid', 'expired'], true),
            'delete' => $quote->status !== 'paid' && ($user->role === 'admin' || $ownerSide),
            'review' => $staff && $quote->status === 'requested',
            'checkout_toggle' => $staff && $quote->status === 'approved',
            'pay' => $quote->status === 'approved' && $quote->checkout_allowed && ($ownerSide || $user->role === 'admin'),
            'assign' => $staff,
            'purchased' => $user->role === 'dealer' && $quote->dealer_user_id === $user->id && $quote->status === 'approved' && $quote->purchased_at === null,
            'refund' => $user->role === 'admin' && $quote->status === 'paid',
            'manual_pay' => $staff && in_array($quote->status, ['approved', 'requested'], true),
            'pdf' => true,
            'convert' => $quote->type === 'wishlist' && $ownerSide && $quote->status !== 'paid',
        ];
    }
}
