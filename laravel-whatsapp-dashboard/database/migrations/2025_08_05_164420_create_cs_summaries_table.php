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
        Schema::create('cs_summaries', function (Blueprint $table) {
            $table->id();
            $table->date('date')->index();
            $table->string('cs_name', 50)->index();
            $table->integer('total_bookings')->default(0);
            $table->decimal('total_cash', 12, 2)->default(0);
            $table->decimal('total_transfer', 12, 2)->default(0);
            $table->decimal('total_commission', 12, 2)->default(0);
            $table->timestamps();

            // Unique constraint for date and cs_name combination
            $table->unique(['date', 'cs_name']);

            // Additional indexes
            $table->index(['date', 'total_commission']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cs_summaries');
    }
};
