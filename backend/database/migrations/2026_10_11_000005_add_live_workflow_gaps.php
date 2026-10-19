<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('avatar_path')->nullable();
            $table->text('bio')->nullable();
            $table->unsignedInteger('monthly_target')->nullable();
            $table->unsignedInteger('yearly_target')->nullable();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->unsignedBigInteger('legacy_id')->nullable()->unique();
        });

        Schema::create('sales_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('client_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('quote_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('body');
            $table->date('due_on')->nullable();
            $table->timestamps();
        });

        Schema::create('ticket_event_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ticket_event_notes');
        Schema::dropIfExists('sales_notes');
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('legacy_id');
        });
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['avatar_path', 'bio', 'monthly_target', 'yearly_target']);
        });
    }
};
