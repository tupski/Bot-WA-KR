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
        Schema::create('processed_messages', function (Blueprint $table) {
            $table->id();
            $table->string('message_id')->unique()->index();
            $table->string('chat_id');
            $table->string('status', 50)->default('processed');
            $table->timestamp('processed_at')->useCurrent();
            $table->timestamps();

            // Additional indexes
            $table->index(['chat_id', 'processed_at']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('processed_messages');
    }
};
