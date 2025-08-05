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
        Schema::table('transactions', function (Blueprint $table) {
            // Rename cs_name to customer_name
            $table->renameColumn('cs_name', 'customer_name');

            // Add new columns
            $table->string('customer_phone')->nullable()->after('customer_name');
            $table->string('whatsapp_group_id')->nullable()->after('chat_id');
            $table->foreignId('processed_by')->nullable()->constrained('users')->onDelete('set null')->after('whatsapp_group_id');
            $table->text('notes')->nullable()->after('processed_by');

            // Add indexes
            $table->index('customer_name');
            $table->index('customer_phone');
            $table->index('whatsapp_group_id');
            $table->index('processed_by');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('transactions', function (Blueprint $table) {
            // Drop new columns
            $table->dropColumn(['customer_phone', 'whatsapp_group_id', 'processed_by', 'notes']);

            // Rename back
            $table->renameColumn('customer_name', 'cs_name');
        });
    }
};
