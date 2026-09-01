<?php

use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\Notification;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('kb, notification, and audit log domain models work properly', function () {
    $role = Role::where('name', RoleName::Employee->value)->first();
    $user = User::create([
        'role_id' => $role->id,
        'email' => 'kb.author@jarvisops.test',
        'password' => 'secret123',
        'full_name' => 'KB Author',
    ]);

    $kbCat = KnowledgeCategory::where('name', 'Hardware Troubleshooting')->first();

    $article = KnowledgeArticle::create([
        'category_id' => $kbCat->id,
        'author_id' => $user->id,
        'title' => 'How to setup VPN',
        'slug' => 'how-to-setup-vpn',
        'content' => 'Step 1: Download client...',
        'status' => 'published',
        'view_count' => 5,
        'published_at' => now(),
    ]);

    $notification = Notification::create([
        'user_id' => $user->id,
        'type' => 'ticket_assigned',
        'data' => ['ticket_id' => 1, 'ticket_number' => 'TCK-20260901-0001'],
        'is_read' => false,
    ]);

    $auditLog = AuditLog::create([
        'user_id' => $user->id,
        'action' => 'CREATE',
        'module' => 'ticket',
        'module_id' => 1,
        'description' => 'Ticket dibuat',
        'old_data' => null,
        'new_data' => ['title' => 'WiFi Issue'],
        'ip_address' => '127.0.0.1',
        'user_agent' => 'Mozilla/5.0',
    ]);

    expect($article->category->id)->toBe($kbCat->id)
        ->and($article->author->id)->toBe($user->id)
        ->and($notification->user->id)->toBe($user->id)
        ->and($notification->data)->toBe(['ticket_id' => 1, 'ticket_number' => 'TCK-20260901-0001'])
        ->and($auditLog->user->id)->toBe($user->id)
        ->and($auditLog->new_data)->toBe(['title' => 'WiFi Issue']);
});
