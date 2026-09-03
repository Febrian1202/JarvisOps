<?php

use App\Models\KnowledgeArticle;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('article resource returns author full_name', function () {
    $tech = User::factory()->technician()->create(['full_name' => 'Budi Santoso']);
    $article = KnowledgeArticle::factory()->create(['author_id' => $tech->id]);

    Sanctum::actingAs($tech);
    $response = $this->getJson("/api/articles/{$article->slug}");

    $response->assertStatus(200)
        ->assertJsonPath('data.author.full_name', 'Budi Santoso');
});
