<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->string('image')->nullable()->after('slug');
            $table->string('pitch')->nullable()->after('refresh_hz');
            $table->string('brightness')->nullable()->after('pitch');
            $table->json('specs')->nullable()->after('brightness');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['image', 'pitch', 'brightness', 'specs']);
        });
    }
};
