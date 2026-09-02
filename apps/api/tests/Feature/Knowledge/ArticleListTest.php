<?php

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('employee sees only published articles', function () {
    KnowledgeArticle::factory()->create(['status' => 'published']);
    KnowledgeArticle::factory()->draft()->create();

    Sanctum::actingAs(User::factory()->employee()->create());

    $response = $this->getJson('/api/articles');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonCount(1, 'data');
});

test('employee filter by status draft is ignored and scoped to published', function () {
    KnowledgeArticle::factory()->create(['status' => 'published']);
    KnowledgeArticle::factory()->draft()->create();

    Sanctum::actingAs(User::factory()->employee()->create());

    $response = $this->getJson('/api/articles?status=draft');

    $response->assertStatus(200)
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'published');
});

test('technician can see both draft and published articles and filter by status', function () {
    KnowledgeArticle::factory()->create(['status' => 'published']);
    KnowledgeArticle::factory()->draft()->create();

    Sanctum::actingAs(User::factory()->technician()->create());

    $allResponse = $this->getJson('/api/articles');
    $allResponse->assertStatus(200)->assertJsonCount(2, 'data');

    $draftResponse = $this->getJson('/api/articles?status=draft');
    $draftResponse->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.status', 'draft');
});

test('search matches title or content with wildcard escaping', function () {
    $cat = KnowledgeCategory::factory()->create();
    KnowledgeArticle::factory()->create([
        'title' => 'Cara Reset 100% Password',
        'content' => 'Gunakan portal self-service.',
        'category_id' => $cat->id,
        'status' => 'published',
    ]);
    KnowledgeArticle::factory()->create([
        'title' => 'Panduan VPN',
        'content' => 'Gunakan credentials 100% aman.',
        'category_id' => $cat->id,
        'status' => 'published',
    ]);
    KnowledgeArticle::factory()->create([
        'title' => 'Printer Troubleshooting',
        'content' => 'Cek koneksi kabel USB.',
        'category_id' => $cat->id,
        'status' => 'published',
    ]);

    Sanctum::actingAs(User::factory()->employee()->create());

    $response = $this->getJson('/api/articles?search=100%');
    $response->assertStatus(200)->assertJsonCount(2, 'data');

    $titleSearch = $this->getJson('/api/articles?search=Printer');
    $titleSearch->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.title', 'Printer Troubleshooting');
});

test('filter by category_id and author_id', function () {
    $cat1 = KnowledgeCategory::factory()->create();
    $cat2 = KnowledgeCategory::factory()->create();
    $author1 = User::factory()->technician()->create();
    $author2 = User::factory()->technician()->create();

    KnowledgeArticle::factory()->create([
        'category_id' => $cat1->id,
        'author_id' => $author1->id,
        'status' => 'published',
    ]);
    KnowledgeArticle::factory()->create([
        'category_id' => $cat2->id,
        'author_id' => $author2->id,
        'status' => 'published',
    ]);

    Sanctum::actingAs(User::factory()->employee()->create());

    $catFilter = $this->getJson("/api/articles?category_id={$cat1->id}");
    $catFilter->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.category.id', $cat1->id);

    $authorFilter = $this->getJson("/api/articles?author_id={$author2->id}");
    $authorFilter->assertStatus(200)->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.author.id', $author2->id);
});

test('sort articles by created_at, title, and view_count', function () {
    $cat = KnowledgeCategory::factory()->create();
    KnowledgeArticle::factory()->create([
        'title' => 'A Article',
        'view_count' => 10,
        'category_id' => $cat->id,
        'status' => 'published',
    ]);
    KnowledgeArticle::factory()->create([
        'title' => 'Z Article',
        'view_count' => 100,
        'category_id' => $cat->id,
        'status' => 'published',
    ]);

    Sanctum::actingAs(User::factory()->employee()->create());

    $sortTitleDesc = $this->getJson('/api/articles?sort_by=title&sort_dir=desc');
    $sortTitleDesc->assertStatus(200)
        ->assertJsonPath('data.0.title', 'Z Article')
        ->assertJsonPath('data.1.title', 'A Article');

    $sortViewDesc = $this->getJson('/api/articles?sort_by=view_count&sort_dir=desc');
    $sortViewDesc->assertStatus(200)
        ->assertJsonPath('data.0.title', 'Z Article')
        ->assertJsonPath('data.1.title', 'A Article');
});
