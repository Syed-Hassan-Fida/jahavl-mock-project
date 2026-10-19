<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('idempotency_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('key', 80);
            $table->string('request_hash', 64);
            $table->unsignedSmallInteger('status_code');
            $table->json('body');
            $table->timestamps();
            $table->unique(['user_id', 'key']);
        });

        Schema::create('live_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('name', 40);
            $table->json('payload');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['user_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('live_events');
        Schema::dropIfExists('idempotency_keys');
    }
};
