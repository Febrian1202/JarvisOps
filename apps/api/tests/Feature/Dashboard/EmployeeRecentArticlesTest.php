<?php

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('employee recent articles include category and author without content', function () {
    $emp = User::factory()->employee()->create();
    $author = User::factory()->technician()->create(['full_name' => 'Budi Santoso']);
    $cat = KnowledgeCategory::factory()->create(['name' => 'Network']);
    $article = KnowledgeArticle::factory()->create([
        'status' => 'published',
        'published_at' => now(),
        'author_id' => $author->id,
        'category_id' => $cat->id,
        'content' => 'Isi panjang yang tidak boleh ikut terkirim ke dashboard',
    ]);

    Sanctum::actingAs($emp);
    $response = $this->getJson('/api/dashboard/employee');
    $articles = $response->json('data.recent_articles');

    expect($articles)->toHaveCount(1)
        ->and($articles[0]['title'])->toBe($article->title)
        ->and($articles[0]['category']['name'])->toBe('Network')
        ->and($articles[0]['author']['full_name'])->toBe('Budi Santoso')
        ->and($articles[0])->not->toHaveKey('content');
});
