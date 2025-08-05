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
        Schema::create('whats_app_groups', function (Blueprint $table) {
            $table->id();
            $table->string('group_id')->unique(); // WhatsApp group ID
            $table->string('group_name'); // Group name from WhatsApp
            $table->string('group_subject')->nullable(); // Group subject
            $table->text('group_description')->nullable(); // Group description
            $table->foreignId('apartment_id')->nullable()->constrained()->onDelete('set null');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_monitoring')->default(false); // Whether bot is monitoring this group
            $table->timestamp('last_activity_at')->nullable();
            $table->integer('participant_count')->default(0);
            $table->integer('admin_count')->default(0);
            $table->timestamp('created_by_bot_at')->nullable(); // When bot first detected this group
            $table->json('settings')->nullable(); // Additional settings
            $table->timestamps();

            $table->index('group_id');
            $table->index('is_active');
            $table->index('is_monitoring');
            $table->index('last_activity_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('whats_app_groups');
    }
};
