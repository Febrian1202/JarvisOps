<?php

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\KnowledgeCategory;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

uses()->group('technical-success', 'security');

// Poin 1: Employee tidak dapat memilih asset milik Employee lain
test('1. employee cannot choose an asset assigned to another employee', function () {
    $empA = User::factory()->employee()->create();
    $empB = User::factory()->employee()->create();
    $assetB = Asset::factory()->create(['status' => AssetStatus::Assigned]);
    AssetAssignment::factory()->create([
        'asset_id' => $assetB->id,
        'user_id' => $empB->id,
        'released_at' => null,
    ]);

    Sanctum::actingAs($empA);

    $this->postJson('/api/tickets', [
        'title' => 'Issue with borrowed asset',
        'description' => 'Attempting to link another user asset',
        'category_id' => TicketCategory::first()->id,
        'priority_id' => TicketPriority::first()->id,
        'asset_id' => $assetB->id,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['asset_id']);
});

// Poin 2: Employee tidak dapat membuat akun sendiri (tidak ada endpoint register publik)
test('2. public registration is not available', function () {
    $this->postJson('/api/register', [
        'email' => 'hacker@test.com',
        'password' => 'Password123!',
    ])->assertStatus(404);
});

// Poin 3: Hanya Admin yang dapat membuat user
test('3. only admin can create new users', function () {
    $emp = User::factory()->employee()->create();
    $tech = User::factory()->technician()->create();
    $mgr = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $payload = [
        'full_name' => 'New User Test',
        'email' => 'newuser_point3@jarvisops.test',
        'password' => 'Password123!',
        'password_confirmation' => 'Password123!',
        'role_id' => 4,
        'department_id' => 1,
        'status' => 'active',
    ];

    Sanctum::actingAs($emp);
    $this->postJson('/api/users', $payload)->assertStatus(403);

    Sanctum::actingAs($tech);
    $this->postJson('/api/users', $payload)->assertStatus(403);

    Sanctum::actingAs($mgr);
    $this->postJson('/api/users', $payload)->assertStatus(403);

    Sanctum::actingAs($admin);
    $this->postJson('/api/users', $payload)->assertStatus(201);
});

// Poin 4: Ticket otomatis mendapatkan SLA deadline
test('4. tickets automatically snapshot SLA duration and deadline at creation', function () {
    $emp = User::factory()->employee()->create();
    $priority = TicketPriority::find(1); // Critical: 120 menit

    Sanctum::actingAs($emp);

    $response = $this->postJson('/api/tickets', [
        'title' => 'Critical System Outage',
        'description' => 'Urgent database failure',
        'category_id' => TicketCategory::first()->id,
        'priority_id' => $priority->id,
    ])->assertStatus(201);

    $ticketId = $response->json('data.id');
    $ticket = Ticket::find($ticketId);

    expect($ticket->sla_duration_minutes)->toBe($priority->sla_minutes);
    expect($ticket->sla_deadline)->not->toBeNull();
    expect($ticket->sla_deadline->timestamp)->toBeGreaterThan(now()->subMinute()->timestamp);
});

// Poin 5: Scheduler dapat mendeteksi SLA breach
test('5. sla scheduler detects and updates breached active tickets', function () {
    $emp = User::factory()->employee()->create();
    $tech = User::factory()->technician()->create();

    $ticket = Ticket::factory()->create([
        'reporter_id' => $emp->id,
        'technician_id' => $tech->id,
        'status_id' => 2, // ASSIGNED
        'sla_deadline' => now()->subMinutes(10),
        'sla_breached' => false,
        'sla_breached_at' => null,
    ]);

    Artisan::call('tickets:check-sla');

    $ticket->refresh();
    expect($ticket->sla_breached)->toBeTrue();
    expect($ticket->sla_breached_at)->not->toBeNull();
});

// Poin 6: SLA breach tersimpan di database
test('6. sla breach state is persisted in database', function () {
    $ticket = Ticket::factory()->create([
        'sla_breached' => true,
        'sla_breached_at' => now(),
    ]);

    $this->assertDatabaseHas('tickets', [
        'id' => $ticket->id,
        'sla_breached' => 1,
    ]);
});

// Poin 7: Notification dibuat ketika event penting terjadi
test('7. notification is created on critical lifecycle events', function () {
    $mgr = User::factory()->manager()->create();
    $tech = User::factory()->technician()->create();
    $ticket = Ticket::factory()->create(['status_id' => 1]);

    Sanctum::actingAs($mgr);

    $this->postJson("/api/tickets/{$ticket->id}/assign", [
        'technician_id' => $tech->id,
    ])->assertStatus(200);

    $this->assertDatabaseHas('notifications', [
        'user_id' => $tech->id,
        'type' => 'TICKET_ASSIGNED',
    ]);
});

// Poin 8: Notification dapat muncul melalui polling
test('8. notifications can be retrieved via polling endpoint', function () {
    $user = User::factory()->technician()->create();
    Notification::factory()->create([
        'user_id' => $user->id,
        'type' => 'TICKET_ASSIGNED',
        'is_read' => false,
    ]);

    Sanctum::actingAs($user);

    $this->getJson('/api/notifications')
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('meta.total', 1)
        ->assertJsonCount(1, 'data');

    $this->getJson('/api/notifications/unread-count')
        ->assertStatus(200)
        ->assertJsonPath('data.unread_count', 1);
});

// Poin 9: Technician dapat membuat dan publish Knowledge Base article
test('9. technician can create and publish knowledge base articles', function () {
    $tech = User::factory()->technician()->create();
    $category = KnowledgeCategory::first();

    Sanctum::actingAs($tech);

    $createRes = $this->postJson('/api/articles', [
        'title' => 'Troubleshooting VPN Connections',
        'content' => 'Detailed steps to resolve VPN timeout.',
        'category_id' => $category->id,
    ])->assertStatus(201);

    $articleId = $createRes->json('data.id');

    $this->postJson("/api/articles/{$articleId}/publish")
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'published');

    $this->assertDatabaseHas('knowledge_articles', [
        'id' => $articleId,
        'status' => 'published',
    ]);
});

// Poin 10: Attachment divalidasi maksimal 5 MB dan hanya menerima format yang ditentukan
test('10. ticket attachment enforces max 5mb and strict MIME type validation', function () {
    Storage::fake('private');
    $emp = User::factory()->employee()->create();
    $ticket = Ticket::factory()->create(['reporter_id' => $emp->id]);

    Sanctum::actingAs($emp);

    // File terlalu besar (>5MB)
    $largeFile = UploadedFile::fake()->create('large.pdf', 5200, 'application/pdf');
    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => $largeFile,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['file']);

    // Format tidak diizinkan (.exe)
    $exeFile = UploadedFile::fake()->create('malicious.exe', 100, 'application/x-msdownload');
    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => $exeFile,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['file']);

    // Format valid (.png <= 5MB)
    $validImage = UploadedFile::fake()->image('screenshot.png', 800, 600)->size(500);
    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => $validImage,
    ])->assertStatus(201);
});

// Poin 11: Semua business-critical authorization divalidasi di Laravel backend
test('11. all business-critical authorizations are strictly enforced at backend', function () {
    $emp = User::factory()->employee()->create();
    $otherTicket = Ticket::factory()->create();

    Sanctum::actingAs($emp);

    // Tidak bisa mengakses tiket orang lain (404 mask)
    $this->getJson("/api/tickets/{$otherTicket->id}")->assertStatus(404);
    // Tidak bisa mengakses audit logs
    $this->getJson('/api/audit-logs')->assertStatus(403);
    // Tidak bisa mengakses master data
    $this->getJson('/api/users')->assertStatus(403);
});
