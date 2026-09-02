<?php

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('employee can view knowledge categories list', function () {
    $initialCount = KnowledgeCategory::count();
    KnowledgeCategory::factory()->count(3)->create();

    Sanctum::actingAs(User::factory()->employee()->create());

    $response = $this->getJson('/api/knowledge-categories');

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonCount($initialCount + 3, 'data');
});

test('admin can create knowledge category', function () {
    Sanctum::actingAs(User::factory()->admin()->create());

    $response = $this->postJson('/api/knowledge-categories', [
        'name' => 'Hardware Problems',
        'description' => 'Troubleshooting hardware',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'Hardware Problems')
        ->assertJsonPath('data.description', 'Troubleshooting hardware');

    $this->assertDatabaseHas('knowledge_categories', [
        'name' => 'Hardware Problems',
        'description' => 'Troubleshooting hardware',
    ]);
});

test('admin can update knowledge category', function () {
    $cat = KnowledgeCategory::factory()->create(['name' => 'Old Name']);

    Sanctum::actingAs(User::factory()->admin()->create());

    $response = $this->putJson("/api/knowledge-categories/{$cat->id}", [
        'name' => 'New Name',
        'description' => 'Updated Description',
    ]);

    $response->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.name', 'New Name');

    expect($cat->fresh()->name)->toBe('New Name');
});

test('admin can delete knowledge category without articles', function () {
    $cat = KnowledgeCategory::factory()->create();

    Sanctum::actingAs(User::factory()->admin()->create());

    $response = $this->deleteJson("/api/knowledge-categories/{$cat->id}");

    $response->assertStatus(200)
        ->assertJsonPath('success', true);

    $this->assertSoftDeleted('knowledge_categories', ['id' => $cat->id]);
});

test('cannot delete knowledge category that has articles (409 conflict)', function () {
    $cat = KnowledgeCategory::factory()->create();
    KnowledgeArticle::factory()->create(['category_id' => $cat->id]);

    Sanctum::actingAs(User::factory()->admin()->create());

    $response = $this->deleteJson("/api/knowledge-categories/{$cat->id}");

    $response->assertStatus(409)
        ->assertJsonPath('success', false)
        ->assertJsonPath('message', 'Kategori masih memiliki artikel dan tidak dapat dihapus.');

    $this->assertNotSoftDeleted('knowledge_categories', ['id' => $cat->id]);
});

test('non-admin cannot create, update, or delete knowledge category', function () {
    $cat = KnowledgeCategory::factory()->create();

    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson('/api/knowledge-categories', ['name' => 'X'])->assertStatus(403);
    $this->putJson("/api/knowledge-categories/{$cat->id}", ['name' => 'Y'])->assertStatus(403);
    $this->deleteJson("/api/knowledge-categories/{$cat->id}")->assertStatus(403);

    Sanctum::actingAs(User::factory()->technician()->create());
    $this->postJson('/api/knowledge-categories', ['name' => 'X'])->assertStatus(403);

    Sanctum::actingAs(User::factory()->employee()->create());
    $this->postJson('/api/knowledge-categories', ['name' => 'X'])->assertStatus(403);
});
