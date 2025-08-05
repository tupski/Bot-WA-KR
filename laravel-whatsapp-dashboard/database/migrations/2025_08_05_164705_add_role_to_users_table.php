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
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 20)->default('viewer')->after('email'); // admin, cs, viewer
            $table->boolean('is_active')->default(true)->after('role');
            $table->string('phone', 20)->nullable()->after('is_active');
            $table->timestamp('last_login_at')->nullable()->after('phone');

            // Index for role
            $table->index(['role', 'is_active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['role', 'is_active']);
            $table->dropColumn(['role', 'is_active', 'phone', 'last_login_at']);
        });
    }
};
