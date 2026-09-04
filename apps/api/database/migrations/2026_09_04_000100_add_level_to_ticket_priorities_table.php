<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('ticket_priorities', function (Blueprint $table) {
            $table->unsignedInteger('level')->nullable()->after('name');
        });

        // Populate initial levels for seeded priorities if they exist
        DB::table('ticket_priorities')->where('name', 'Critical')->update(['level' => 1]);
        DB::table('ticket_priorities')->where('name', 'High')->update(['level' => 2]);
        DB::table('ticket_priorities')->where('name', 'Medium')->update(['level' => 3]);
        DB::table('ticket_priorities')->where('name', 'Low')->update(['level' => 4]);

        Schema::table('ticket_priorities', function (Blueprint $table) {
            $table->unique('level');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ticket_priorities', function (Blueprint $table) {
            $table->dropUnique(['level']);
            $table->dropColumn('level');
        });
    }
};
