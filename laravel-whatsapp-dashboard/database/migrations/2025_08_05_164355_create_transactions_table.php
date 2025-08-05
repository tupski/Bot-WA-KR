<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->string('message_id')->nullable()->index();
            $table->string('location', 100)->index();
            $table->string('unit', 50);
            $table->string('checkout_time', 100);
            $table->string('duration', 50);
            $table->string('payment_method', 20)->index();
            $table->string('cs_name', 50)->index();
            $table->decimal('commission', 10, 2)->default(0);
            $table->decimal('amount', 12, 2);
            $table->decimal('net_amount', 12, 2);
            $table->boolean('skip_financial')->default(false);
            $table->date('date_only')->index();
            $table->string('chat_id')->nullable()->index(); // WhatsApp chat ID
            $table->timestamps();

            // Indexes for better performance
            $table->index(['date_only', 'location']);
            $table->index(['date_only', 'cs_name']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
