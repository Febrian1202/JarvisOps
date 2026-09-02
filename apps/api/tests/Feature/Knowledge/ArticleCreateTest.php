<?php

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('technician can create draft article', function () {
    $tech = User::factory()->technician()->create();
    $category = KnowledgeCategory::factory()->create();

    Sanctum::actingAs($tech);

    $response = $this->postJson('/api/articles', [
        'title' => 'Wi-Fi Troubleshooting',
        'category_id' => $category->id,
        'content' => 'Langkah-langkah troubleshooting wifi...',
        'status' => 'draft',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.title', 'Wi-Fi Troubleshooting')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.slug', 'wi-fi-troubleshooting')
        ->assertJsonPath('data.category.id', $category->id)
        ->assertJsonPath('data.author.id', $tech->id)
        ->assertJsonPath('data.view_count', 0)
        ->assertJsonPath('data.published_at', null);

    $this->assertDatabaseHas('knowledge_articles', [
        'title' => 'Wi-Fi Troubleshooting',
        'slug' => 'wi-fi-troubleshooting',
        'status' => 'draft',
        'author_id' => $tech->id,
        'category_id' => $category->id,
    ]);
});

test('create published article sets published_at', function () {
    $tech = User::factory()->technician()->create();
    $category = KnowledgeCategory::factory()->create();

    Sanctum::actingAs($tech);

    $response = $this->postJson('/api/articles', [
        'title' => 'VPN Setup',
        'category_id' => $category->id,
        'content' => 'Panduan setup VPN...',
        'status' => 'published',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status', 'published');

    $article = KnowledgeArticle::where('title', 'VPN Setup')->first();
    expect($article)->not->toBeNull()
        ->and($article->published_at)->not->toBeNull();
});

test('duplicate slug gets incremental suffix', function () {
    $tech = User::factory()->technician()->create();
    $category = KnowledgeCategory::factory()->create();

    Sanctum::actingAs($tech);

    $this->postJson('/api/articles', [
        'title' => 'Troubleshooting Guide',
        'category_id' => $category->id,
        'content' => 'Content 1',
    ])->assertStatus(201)->assertJsonPath('data.slug', 'troubleshooting-guide');

    $this->postJson('/api/articles', [
        'title' => 'Troubleshooting Guide',
        'category_id' => $category->id,
        'content' => 'Content 2',
    ])->assertStatus(201)->assertJsonPath('data.slug', 'troubleshooting-guide-2');

    $this->postJson('/api/articles', [
        'title' => 'Troubleshooting Guide',
        'category_id' => $category->id,
        'content' => 'Content 3',
    ])->assertStatus(201)->assertJsonPath('data.slug', 'troubleshooting-guide-3');
});

test('slug generation accounts for soft deleted articles', function () {
    $tech = User::factory()->technician()->create();
    $category = KnowledgeCategory::factory()->create();

    $deletedArticle = KnowledgeArticle::factory()->create([
        'title' => 'Deleted Guide',
        'slug' => 'deleted-guide',
        'category_id' => $category->id,
    ]);
    $deletedArticle->delete();

    Sanctum::actingAs($tech);

    $this->postJson('/api/articles', [
        'title' => 'Deleted Guide',
        'category_id' => $category->id,
        'content' => 'New guide after soft delete',
    ])->assertStatus(201)->assertJsonPath('data.slug', 'deleted-guide-2');
});

test('non-ascii or empty slug falls back to safe prefix', function () {
    $tech = User::factory()->technician()->create();
    $category = KnowledgeCategory::factory()->create();

    Sanctum::actingAs($tech);

    $response = $this->postJson('/api/articles', [
        'title' => '??? !!!',
        'category_id' => $category->id,
        'content' => 'Special chars only',
    ]);

    $response->assertStatus(201);
    $slug = $response->json('data.slug');
    expect($slug)->toStartWith('article-');
});

test('employee cannot create article', function () {
    $employee = User::factory()->employee()->create();
    $category = KnowledgeCategory::factory()->create();

    Sanctum::actingAs($employee);

    $this->postJson('/api/articles', [
        'title' => 'Unauthorized Guide',
        'category_id' => $category->id,
        'content' => 'Employee should be forbidden',
    ])->assertStatus(403);
});
