<?php

use App\Enums\RoleName;
use App\Enums\TicketStatusName;
use App\Models\Asset;
use App\Models\Department;
use App\Models\KnowledgeArticle;
use App\Models\KnowledgeCategory;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('no model contains timestamps or deleted_at in fillable', function () {
    $models = [
        User::class,
        Ticket::class,
        Asset::class,
        KnowledgeArticle::class,
        Department::class,
        TicketCategory::class,
        TicketPriority::class,
        KnowledgeCategory::class,
    ];

    $forbidden = ['created_at', 'updated_at', 'deleted_at'];

    foreach ($models as $modelClass) {
        $fillable = (new $modelClass)->getFillable();
        foreach ($forbidden as $col) {
            expect($fillable)->not->toContain($col, "{$modelClass} should not have {$col} in fillable");
        }
    }
});

test('ticket creation ignores client-supplied server-managed fields', function () {
    $user = User::factory()->employee()->create();
    $otherUser = User::factory()->employee()->create();
    $category = TicketCategory::first() ?? TicketCategory::factory()->create();
    $priority = TicketPriority::first() ?? TicketPriority::factory()->create();
    $closedStatus = TicketStatus::where('name', TicketStatusName::Closed->value)->first();

    Sanctum::actingAs($user);

    $response = $this->postJson('/api/tickets', [
        'title' => 'Printer issue',
        'description' => 'Cannot print documents',
        'category_id' => $category->id,
        'priority_id' => $priority->id,
        // Malicious client-supplied overrides
        'reporter_id' => $otherUser->id,
        'status_id' => $closedStatus?->id ?? 5,
        'ticket_number' => 'TCK-HACKED-999',
        'sla_breached' => true,
        'sla_duration_minutes' => 99999,
    ]);

    $response->assertStatus(201);
    $ticketId = $response->json('data.id');

    $ticket = Ticket::find($ticketId);
    expect($ticket->reporter_id)->toBe($user->id);
    expect($ticket->ticket_number)->not->toBe('TCK-HACKED-999');
    expect($ticket->ticket_number)->toStartWith('TCK-');
    expect($ticket->sla_breached)->toBeFalse();
    expect($ticket->status->name)->toBe(TicketStatusName::Open->value);
});

test('profile update ignores role_id, status, and email manipulation', function () {
    $adminRole = Role::where('name', RoleName::Admin->value)->first();
    $user = User::factory()->employee()->create([
        'status' => 'active',
    ]);
    $originalRoleId = $user->role_id;
    $originalEmail = $user->email;

    Sanctum::actingAs($user);

    $response = $this->putJson('/api/me', [
        'full_name' => 'Renamed Employee',
        // Malicious privilege escalation attempts
        'role_id' => $adminRole->id,
        'status' => 'inactive',
        'email' => 'hacked@domain.com',
        'must_change_password' => false,
    ]);

    $response->assertStatus(200);

    $user->refresh();
    expect($user->full_name)->toBe('Renamed Employee');
    expect($user->role_id)->toBe($originalRoleId);
    expect($user->status)->toBe('active');
    expect($user->email)->toBe($originalEmail);
});

test('article creation enforces authenticated user as author and ignores view_count injection', function () {
    $technician = User::factory()->technician()->create();
    $otherUser = User::factory()->admin()->create();
    $category = KnowledgeCategory::first() ?? KnowledgeCategory::factory()->create();

    Sanctum::actingAs($technician);

    $response = $this->postJson('/api/articles', [
        'title' => 'Secure Hardware Setup Guide',
        'content' => 'Comprehensive instructions for setting up workstations securely.',
        'category_id' => $category->id,
        // Malicious client-supplied overrides
        'author_id' => $otherUser->id,
        'view_count' => 50000,
        'published_at' => '2020-01-01 00:00:00',
    ]);

    $response->assertStatus(201);
    $articleId = $response->json('data.id');

    $article = KnowledgeArticle::find($articleId);
    expect($article->author_id)->toBe($technician->id);
    expect($article->view_count)->toBe(0);
});
