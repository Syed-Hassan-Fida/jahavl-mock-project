<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->index(['is_published', 'series_id'], 'products_published_series_idx');
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->index(['user_id', 'status'], 'quotes_user_status_idx');
        });

        Schema::table('quote_items', function (Blueprint $table) {
            $table->index(['quote_id', 'parent_id'], 'quote_items_quote_parent_idx');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('products_published_series_idx');
        });
        Schema::table('quotes', function (Blueprint $table) {
            $table->dropIndex('quotes_user_status_idx');
        });
        Schema::table('quote_items', function (Blueprint $table) {
            $table->dropIndex('quote_items_quote_parent_idx');
        });
    }
};
