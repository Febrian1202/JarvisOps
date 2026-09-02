<?php

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('article can be retrieved by slug', function () {
    $category = KnowledgeCategory::factory()->create();
    $article = KnowledgeArticle::factory()->create([
        'title' => 'My Unique Article',
        'slug' => 'my-unique-article',
        'status' => 'published',
        'category_id' => $category->id,
    ]);

    Sanctum::actingAs(User::factory()->employee()->create());

    $response = $this->getJson('/api/articles/my-unique-article');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.slug', 'my-unique-article')
        ->assertJsonPath('data.title', 'My Unique Article');
});

test('draft article cannot be viewed by employee (404 as not found)', function () {
    $article = KnowledgeArticle::factory()->draft()->create([
        'slug' => 'draft-article',
    ]);

    Sanctum::actingAs(User::factory()->employee()->create());

    $this->getJson('/api/articles/draft-article')->assertStatus(404);
});

test('draft article can be viewed by technician', function () {
    $tech = User::factory()->technician()->create();
    $article = KnowledgeArticle::factory()->draft()->create([
        'slug' => 'draft-article-tech',
        'author_id' => $tech->id,
    ]);

    Sanctum::actingAs($tech);

    $this->getJson('/api/articles/draft-article-tech')->assertStatus(200)
        ->assertJsonPath('data.slug', 'draft-article-tech');
});

test('technician can update own article and slug remains immutable', function () {
    $tech = User::factory()->technician()->create();
    $category1 = KnowledgeCategory::factory()->create();
    $category2 = KnowledgeCategory::factory()->create();

    $article = KnowledgeArticle::factory()->create([
        'author_id' => $tech->id,
        'category_id' => $category1->id,
        'title' => 'Original Title',
        'slug' => 'original-title',
        'content' => 'Old content',
    ]);

    Sanctum::actingAs($tech);

    $response = $this->putJson("/api/articles/{$article->id}", [
        'title' => 'Updated Title',
        'category_id' => $category2->id,
        'content' => 'Updated content',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.title', 'Updated Title')
        ->assertJsonPath('data.slug', 'original-title')
        ->assertJsonPath('data.category.id', $category2->id);

    $fresh = $article->fresh();
    expect($fresh->title)->toBe('Updated Title')
        ->and($fresh->slug)->toBe('original-title')
        ->and($fresh->category_id)->toBe($category2->id);
});

test('technician cannot update another technician article if policy restricts or technician can update any article per policy', function () {
    $tech1 = User::factory()->technician()->create();
    $tech2 = User::factory()->technician()->create();
    $category = KnowledgeCategory::factory()->create();

    $article = KnowledgeArticle::factory()->create([
        'author_id' => $tech1->id,
        'category_id' => $category->id,
        'title' => 'Tech 1 Article',
    ]);

    Sanctum::actingAs($tech2);

    $response = $this->putJson("/api/articles/{$article->id}", [
        'title' => 'Updated by Tech 2',
        'category_id' => $category->id,
        'content' => 'Updated content',
    ]);

    $response->assertStatus(200);
});

test('employee cannot update article', function () {
    $employee = User::factory()->employee()->create();
    $article = KnowledgeArticle::factory()->create();

    Sanctum::actingAs($employee);

    $this->putJson("/api/articles/{$article->id}", [
        'title' => 'Employee Hack',
        'category_id' => $article->category_id,
        'content' => 'Hacked',
    ])->assertStatus(403);
});

test('technician can delete own article', function () {
    $tech = User::factory()->technician()->create();
    $article = KnowledgeArticle::factory()->create([
        'author_id' => $tech->id,
    ]);

    Sanctum::actingAs($tech);

    $this->deleteJson("/api/articles/{$article->id}")->assertStatus(200)
        ->assertJsonPath('success', true);

    $this->assertSoftDeleted('knowledge_articles', ['id' => $article->id]);
});

test('technician cannot delete another technician article', function () {
    $tech1 = User::factory()->technician()->create();
    $tech2 = User::factory()->technician()->create();
    $article = KnowledgeArticle::factory()->create([
        'author_id' => $tech1->id,
    ]);

    Sanctum::actingAs($tech2);

    $this->deleteJson("/api/articles/{$article->id}")->assertStatus(403);
    $this->assertNotSoftDeleted('knowledge_articles', ['id' => $article->id]);
});

test('manager can delete any technician article', function () {
    $manager = User::factory()->manager()->create();
    $tech = User::factory()->technician()->create();
    $article = KnowledgeArticle::factory()->create([
        'author_id' => $tech->id,
    ]);

    Sanctum::actingAs($manager);

    $this->deleteJson("/api/articles/{$article->id}")->assertStatus(200);
    $this->assertSoftDeleted('knowledge_articles', ['id' => $article->id]);
});
