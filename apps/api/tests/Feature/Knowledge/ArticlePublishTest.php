<?php

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('technician can publish article', function () {
    $tech = User::factory()->technician()->create();
    $article = KnowledgeArticle::factory()->draft()->create([
        'author_id' => $tech->id,
        'published_at' => null,
    ]);

    Sanctum::actingAs($tech);

    $response = $this->postJson("/api/articles/{$article->id}/publish");

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'published');

    expect($article->fresh()->published_at)->not->toBeNull();
});

test('view_count increments on show without updating updated_at', function () {
    $article = KnowledgeArticle::factory()->create([
        'status' => 'published',
        'view_count' => 5,
        'updated_at' => now()->subDay(),
    ]);

    $originalUpdatedAt = $article->updated_at->toISOString();

    Sanctum::actingAs(User::factory()->employee()->create());

    $response = $this->getJson("/api/articles/{$article->slug}");

    $response->assertStatus(200);

    $fresh = $article->fresh();
    expect($fresh->view_count)->toBe(6)
        ->and($fresh->updated_at->toISOString())->toBe($originalUpdatedAt);
});

test('unpublish sets status to draft and preserves published_at', function () {
    $publishedTime = now()->subDays(2);
    $article = KnowledgeArticle::factory()->create([
        'status' => 'published',
        'published_at' => $publishedTime,
    ]);

    Sanctum::actingAs(User::factory()->manager()->create());

    $response = $this->postJson("/api/articles/{$article->id}/unpublish");

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'draft');

    $fresh = $article->fresh();
    expect($fresh->status->value)->toBe('draft')
        ->and($fresh->published_at)->not->toBeNull();
});

test('employee cannot publish or unpublish article', function () {
    $article = KnowledgeArticle::factory()->create(['status' => 'published']);
    $draftArticle = KnowledgeArticle::factory()->draft()->create();

    Sanctum::actingAs(User::factory()->employee()->create());

    $this->postJson("/api/articles/{$draftArticle->id}/publish")->assertStatus(403);
    $this->postJson("/api/articles/{$article->id}/unpublish")->assertStatus(403);
});

test('show returns up to 5 published related articles in same category excluding self', function () {
    $category = KnowledgeCategory::factory()->create();
    $mainArticle = KnowledgeArticle::factory()->create([
        'category_id' => $category->id,
        'status' => 'published',
        'slug' => 'main-article',
    ]);

    // Create 6 other published articles in same category
    for ($i = 1; $i <= 6; $i++) {
        KnowledgeArticle::factory()->create([
            'category_id' => $category->id,
            'status' => 'published',
            'view_count' => $i * 10,
        ]);
    }

    // Create 1 draft in same category
    KnowledgeArticle::factory()->draft()->create([
        'category_id' => $category->id,
    ]);

    // Create 1 article in another category
    KnowledgeArticle::factory()->create([
        'category_id' => KnowledgeCategory::factory()->create()->id,
        'status' => 'published',
    ]);

    Sanctum::actingAs(User::factory()->employee()->create());

    $response = $this->getJson("/api/articles/{$mainArticle->slug}");

    $response->assertStatus(200);
    $related = $response->json('data.related_articles') ?? $response->json('related_articles');

    expect($related)->toBeArray()
        ->and(count($related))->toBe(5);

    $ids = array_column($related, 'id');
    expect($ids)->not->toContain($mainArticle->id);
});
