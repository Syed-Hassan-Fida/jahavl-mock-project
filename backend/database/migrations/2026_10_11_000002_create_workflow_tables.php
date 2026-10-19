<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('company_name')->nullable();
            $table->string('phone')->nullable();
            $table->decimal('sales_tax_percent', 8, 3)->default(0);
            $table->string('tax_status')->default('taxable');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->decimal('cost', 12, 2)->default(0);
            $table->decimal('weight', 10, 2)->nullable();
            $table->decimal('shipping_amount', 12, 2)->default(0);
            $table->decimal('tariff', 12, 2)->default(0);
            $table->decimal('markup_percent', 8, 2)->default(0);
            $table->decimal('dealer_markup_percent', 8, 2)->default(0);
            $table->boolean('featured')->default(false);
        });

        Schema::table('quotes', function (Blueprint $table) {
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('sales_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('dealer_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->decimal('shipping', 12, 2)->default(0);
            $table->decimal('discount', 12, 2)->default(0);
            $table->decimal('tax', 12, 2)->default(0);
            $table->decimal('commission', 12, 2)->default(0);
            $table->string('charge_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('purchased_at')->nullable();
        });

        Schema::disableForeignKeyConstraints();
        Schema::create('quote_lines', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('quote_lines')->cascadeOnDelete();
            $table->string('kind')->default('product');
            $table->string('label')->nullable();
            $table->unsignedInteger('quantity');
            $table->decimal('unit_price', 12, 2);
            $table->timestamps();
        });

        DB::table('quote_items')->orderBy('id')->get()->each(function ($row) {
            DB::table('quote_lines')->insert([
                'id' => $row->id,
                'quote_id' => $row->quote_id,
                'product_id' => $row->product_id,
                'parent_id' => null,
                'kind' => 'product',
                'label' => null,
                'quantity' => $row->quantity,
                'unit_price' => $row->unit_price,
                'created_at' => $row->created_at,
                'updated_at' => $row->updated_at,
            ]);
        });
        Schema::drop('quote_items');
        Schema::rename('quote_lines', 'quote_items');
        Schema::enableForeignKeyConstraints();

        Schema::create('addresses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('label')->default('Shipping');
            $table->string('line1');
            $table->string('line2')->nullable();
            $table->string('city');
            $table->string('region');
            $table->string('postal_code');
            $table->string('country')->default('US');
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('payment_methods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->string('brand')->nullable();
            $table->string('last4', 4);
            $table->unsignedTinyInteger('exp_month')->nullable();
            $table->unsignedSmallInteger('exp_year')->nullable();
            $table->string('bank_name')->nullable();
            $table->string('account_type')->nullable();
            $table->string('holder_name');
            $table->string('provider_id')->nullable();
            $table->boolean('is_default')->default(false);
            $table->timestamps();
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quote_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('payment_method_id')->nullable()->constrained()->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('kind');
            $table->string('status')->default('succeeded');
            $table->string('charge_id')->nullable();
            $table->string('idempotency_key')->nullable()->unique();
            $table->text('note')->nullable();
            $table->timestamps();
        });

        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payment_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('reason')->nullable();
            $table->string('charge_id')->nullable();
            $table->timestamps();
        });

        Schema::create('dealer_applications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('contact_name');
            $table->string('email');
            $table->string('company_name');
            $table->string('phone')->nullable();
            $table->string('ein')->nullable();
            $table->unsignedSmallInteger('years_in_business')->nullable();
            $table->decimal('anticipated_sales', 12, 2)->nullable();
            $table->string('document_path')->nullable();
            $table->string('status')->default('pending');
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        Schema::create('tax_exemption_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('document_path')->nullable();
            $table->text('note')->nullable();
            $table->string('status')->default('pending');
            $table->text('review_note')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->unique(['sales_user_id', 'client_user_id']);
        });

        Schema::create('dealer_clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('dealer_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_user_id')->constrained('users')->cascadeOnDelete();
            $table->unique(['dealer_user_id', 'client_user_id']);
        });

        Schema::create('sales_dealers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('dealer_user_id')->constrained('users')->cascadeOnDelete();
            $table->unique(['sales_user_id', 'dealer_user_id']);
        });

        Schema::create('tickets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('assignee_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('subject');
            $table->string('status')->default('open');
            $table->timestamps();
        });

        Schema::create('ticket_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('body');
            $table->string('status')->nullable();
            $table->string('attachment_path')->nullable();
            $table->timestamps();
        });

        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('recipient_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->string('attachment_path')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });

        Schema::create('sales_tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sales_user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('related_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('notes')->nullable();
            $table->date('due_on')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        Schema::create('product_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('path');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_documents');
        Schema::dropIfExists('sales_tasks');
        Schema::dropIfExists('notifications');
        Schema::dropIfExists('messages');
        Schema::dropIfExists('ticket_events');
        Schema::dropIfExists('tickets');
        Schema::dropIfExists('sales_dealers');
        Schema::dropIfExists('dealer_clients');
        Schema::dropIfExists('sales_clients');
        Schema::dropIfExists('tax_exemption_requests');
        Schema::dropIfExists('dealer_applications');
        Schema::dropIfExists('refunds');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('payment_methods');
        Schema::dropIfExists('addresses');
    }
};
