<?php

use App\Enums\ArticleStatus;
use App\Enums\AssetHistoryAction;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Models\Asset;
use App\Models\KnowledgeArticle;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

test('all phase 5 enums are accessible', function () {
    expect(ArticleStatus::cases())->toHaveCount(2)
        ->and(AssetHistoryAction::cases())->toHaveCount(4)
        ->and(AuditAction::Release)->not->toBeNull()
        ->and(AuditAction::Publish)->not->toBeNull()
        ->and(AuditAction::Unpublish)->not->toBeNull()
        ->and(AuditAction::Activate)->not->toBeNull()
        ->and(AuditAction::Deactivate)->not->toBeNull()
        ->and(AuditModule::KnowledgeCategory)->not->toBeNull();
});

test('private disk is configured and writable', function () {
    Storage::disk('private')->put('test.txt', 'hello');
    expect(Storage::disk('private')->exists('test.txt'))->toBeTrue();
    Storage::disk('private')->delete('test.txt');
});

test('article policy gates are registered', function () {
    $admin = User::factory()->admin()->create();
    $employee = User::factory()->employee()->create();

    expect(Gate::forUser($admin)->allows('create', KnowledgeArticle::class))->toBeTrue()
        ->and(Gate::forUser($employee)->allows('create', KnowledgeArticle::class))->toBeFalse();
});

test('asset policy new abilities are registered', function () {
    $manager = User::factory()->manager()->create();
    $tech = User::factory()->technician()->create();
    $asset = Asset::factory()->create();

    expect(Gate::forUser($manager)->allows('delete', $asset))->toBeTrue()
        ->and(Gate::forUser($tech)->allows('delete', $asset))->toBeFalse()
        ->and(Gate::forUser($manager)->allows('assign', $asset))->toBeTrue()
        ->and(Gate::forUser($tech)->allows('assign', $asset))->toBeTrue();
});
