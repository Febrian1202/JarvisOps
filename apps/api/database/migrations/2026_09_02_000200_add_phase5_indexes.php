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
        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->index('title', 'idx_knowledge_articles_title');
            $table->index('status', 'idx_knowledge_articles_status');
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->index('status', 'idx_assets_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('knowledge_articles', function (Blueprint $table) {
            $table->dropIndex('idx_knowledge_articles_title');
            $table->dropIndex('idx_knowledge_articles_status');
        });

        Schema::table('assets', function (Blueprint $table) {
            $table->dropIndex('idx_assets_status');
        });
    }
};
