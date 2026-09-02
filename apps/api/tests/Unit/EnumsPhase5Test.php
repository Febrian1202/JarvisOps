<?php

use App\Enums\ArticleStatus;
use App\Enums\AssetHistoryAction;
use App\Enums\AuditAction;
use App\Enums\AuditModule;

test('ArticleStatus enum contains draft and published', function () {
    expect(ArticleStatus::Draft->value)->toBe('draft')
        ->and(ArticleStatus::Published->value)->toBe('published');
});

test('AssetHistoryAction enum contains four values', function () {
    expect(AssetHistoryAction::Created->value)->toBe('created')
        ->and(AssetHistoryAction::Assigned->value)->toBe('assigned')
        ->and(AssetHistoryAction::Released->value)->toBe('released')
        ->and(AssetHistoryAction::StatusChanged->value)->toBe('status_changed');
});

test('AuditAction has new phase 5 cases', function () {
    expect(AuditAction::Release->value)->toBe('release')
        ->and(AuditAction::Publish->value)->toBe('publish')
        ->and(AuditAction::Unpublish->value)->toBe('unpublish')
        ->and(AuditAction::Activate->value)->toBe('activate')
        ->and(AuditAction::Deactivate->value)->toBe('deactivate');
});

test('AuditModule has KnowledgeCategory', function () {
    expect(AuditModule::KnowledgeCategory->value)->toBe('knowledge_category');
});
