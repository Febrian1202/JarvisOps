<?php

use App\Models\KnowledgeArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('viewAny is allowed for all authenticated users', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    expect(Gate::forUser($employee)->allows('viewAny', KnowledgeArticle::class))->toBeTrue()
        ->and(Gate::forUser($technician)->allows('viewAny', KnowledgeArticle::class))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('viewAny', KnowledgeArticle::class))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('viewAny', KnowledgeArticle::class))->toBeTrue();
});

test('view allows employee only for published articles, but technician manager admin for any status', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $publishedArticle = KnowledgeArticle::factory()->create(['status' => 'published']);
    $draftArticle = KnowledgeArticle::factory()->create(['status' => 'draft']);

    expect(Gate::forUser($employee)->allows('view', $publishedArticle))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('view', $draftArticle))->toBeFalse()
        ->and(Gate::forUser($technician)->allows('view', $draftArticle))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('view', $draftArticle))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('view', $draftArticle))->toBeTrue();
});

test('create is allowed for technician manager admin but denied for employee', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    expect(Gate::forUser($employee)->allows('create', KnowledgeArticle::class))->toBeFalse()
        ->and(Gate::forUser($technician)->allows('create', KnowledgeArticle::class))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('create', KnowledgeArticle::class))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('create', KnowledgeArticle::class))->toBeTrue();
});

test('update publish and unpublish are allowed for technician manager admin even on articles by others', function () {
    $employee = User::factory()->employee()->create();
    $author = User::factory()->technician()->create();
    $otherTech = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $article = KnowledgeArticle::factory()->create(['author_id' => $author->id]);

    expect(Gate::forUser($otherTech)->allows('update', $article))->toBeTrue()
        ->and(Gate::forUser($otherTech)->allows('publish', $article))->toBeTrue()
        ->and(Gate::forUser($otherTech)->allows('unpublish', $article))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('update', $article))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('update', $article))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('update', $article))->toBeFalse();
});

test('delete is allowed for manager admin and author technician, but denied for other technicians and employee', function () {
    $employee = User::factory()->employee()->create();
    $authorTech = User::factory()->technician()->create();
    $otherTech = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $article = KnowledgeArticle::factory()->create(['author_id' => $authorTech->id]);

    expect(Gate::forUser($authorTech)->allows('delete', $article))->toBeTrue()
        ->and(Gate::forUser($otherTech)->allows('delete', $article))->toBeFalse()
        ->and(Gate::forUser($manager)->allows('delete', $article))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('delete', $article))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('delete', $article))->toBeFalse();
});
