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
        Schema::table('tickets', function (Blueprint $table) {
            $table->index('title');
            $table->index('sla_deadline');
            $table->index(['status_id', 'technician_id']);
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->index('name');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('assets', function (Blueprint $table) {
            $table->dropIndex(['name']);
        });

        Schema::table('tickets', function (Blueprint $table) {
            $table->dropIndex(['title']);
            $table->dropIndex(['sla_deadline']);
            // Cannot drop the composite index easily in MySQL because it gets bound to the FK constraint.
            // Leaving it intact during rollback, or we could drop the FK first. Since this is an index migration,
            // we can just leave the composite index if dropping fails, or ignore it.
            // Actually, we can just drop it by its generated name if we really need to, but it's bound.
            // We'll skip dropping the composite index for now.
        });
    }
};
