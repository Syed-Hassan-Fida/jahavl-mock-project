<?php

namespace App\Providers;

use App\Domain\ReadCache;
use App\Models\Quote;
use App\Models\QuoteItem;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $bump = function () {
            ReadCache::bump('analytics');
        };
        Quote::saved($bump);
        Quote::deleted($bump);
        QuoteItem::saved($bump);
        QuoteItem::deleted($bump);
    }
}
