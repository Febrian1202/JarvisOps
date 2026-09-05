<?php

use App\Enums\AssetStatus;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

test('employee cannot view or manipulate another employees ticket (returns 404)', function () {
    $owner = User::factory()->employee()->create();
    $attacker = User::factory()->employee()->create();

    $ticket = Ticket::factory()->create([
        'reporter_id' => $owner->id,
    ]);

    Sanctum::actingAs($attacker);

    // View ticket detail
    $this->getJson("/api/tickets/{$ticket->id}")
        ->assertStatus(404)
        ->assertJson(['success' => false, 'message' => 'Resource not found.']);

    // View ticket history
    $this->getJson("/api/tickets/{$ticket->id}/histories")
        ->assertStatus(404);

    // Comment on ticket
    $this->postJson("/api/tickets/{$ticket->id}/comments", [
        'body' => 'Unauthorized intrusion attempt.',
    ])->assertStatus(404);

    // Change status
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 5,
    ])->assertStatus(404);
});

test('employee ticket list strictly isolates data to own tickets', function () {
    $owner = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();

    Ticket::factory()->count(3)->create(['reporter_id' => $owner->id]);
    Ticket::factory()->count(2)->create(['reporter_id' => $other->id]);

    Sanctum::actingAs($owner);

    $response = $this->getJson('/api/tickets');
    $response->assertStatus(200);

    $items = $response->json('data');
    expect($items)->toHaveCount(3);
    foreach ($items as $item) {
        expect($item['reporter']['id'])->toBe($owner->id);
    }
});

test('employee cannot access or download attachments of another users ticket', function () {
    Storage::fake('private');

    $owner = User::factory()->employee()->create();
    $attacker = User::factory()->employee()->create();

    $ticket = Ticket::factory()->create(['reporter_id' => $owner->id]);

    $file = UploadedFile::fake()->create('contract.pdf', 100, 'application/pdf');
    $path = $file->store('attachments', 'private');

    $attachment = TicketAttachment::create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $owner->id,
        'original_filename' => 'contract.pdf',
        'stored_filename' => basename($path),
        'mime_type' => 'application/pdf',
        'file_size' => 102400,
        'storage_path' => $path,
    ]);

    Sanctum::actingAs($attacker);

    // List attachments
    $this->getJson("/api/tickets/{$ticket->id}/attachments")
        ->assertStatus(404);

    // Download attachment
    $this->getJson("/api/attachments/{$attachment->id}/download")
        ->assertStatus(404);
});

test('user cannot read or mark as read another users notification, even as admin (D-16)', function () {
    $victim = User::factory()->employee()->create();
    $attacker = User::factory()->employee()->create();
    $admin = User::factory()->admin()->create();

    $notification = Notification::create([
        'user_id' => $victim->id,
        'type' => 'TICKET_ASSIGNED',
        'data' => ['ticket_id' => 1, 'ticket_number' => 'TCK-0001', 'title' => 'Private Issue'],
        'is_read' => false,
    ]);

    // Attacker tries to read
    Sanctum::actingAs($attacker);
    $this->postJson("/api/notifications/{$notification->id}/read")
        ->assertStatus(404);

    // Admin tries to read (D-16 exception #3: admin cannot bypass notification isolation)
    Sanctum::actingAs($admin);
    $this->postJson("/api/notifications/{$notification->id}/read")
        ->assertStatus(404);
});

test('asset scoping prevents accessing or binding another employees assets', function () {
    $employeeA = User::factory()->employee()->create();
    $employeeB = User::factory()->employee()->create();

    $assetA = Asset::factory()->create(['status' => AssetStatus::Assigned->value]);
    $assetB = Asset::factory()->create(['status' => AssetStatus::Assigned->value]);

    AssetAssignment::create([
        'asset_id' => $assetA->id,
        'user_id' => $employeeA->id,
        'assigned_at' => now(),
    ]);

    AssetAssignment::create([
        'asset_id' => $assetB->id,
        'user_id' => $employeeB->id,
        'assigned_at' => now(),
    ]);

    Sanctum::actingAs($employeeA);

    // Employee A lists my-assets -> sees only asset A
    $response = $this->getJson('/api/my-assets');
    $response->assertStatus(200);
    $ids = collect($response->json('data'))->pluck('id')->all();
    expect($ids)->toContain($assetA->id);
    expect($ids)->not->toContain($assetB->id);

    // Employee A attempts to create a ticket bound to Employee B's asset -> rejected with 422
    $category = TicketCategory::first() ?? TicketCategory::factory()->create();
    $priority = TicketPriority::first() ?? TicketPriority::factory()->create();

    $this->postJson('/api/tickets', [
        'title' => 'Stolen asset ticket',
        'description' => 'Trying to report on B asset',
        'category_id' => $category->id,
        'priority_id' => $priority->id,
        'asset_id' => $assetB->id,
    ])->assertStatus(422)
        ->assertJsonValidationErrors(['asset_id']);
});

test('manager audit log access is restricted to operational modules and cannot view admin modules', function () {
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $userModuleLog = AuditLog::create([
        'user_id' => $admin->id,
        'action' => AuditAction::Create->value,
        'module' => AuditModule::User->value,
        'module_id' => 999,
        'description' => 'Admin created new user',
        'old_data' => null,
        'new_data' => ['email' => 'new@domain.com'],
        'ip_address' => '127.0.0.1',
        'user_agent' => 'TestAgent',
    ]);

    Sanctum::actingAs($manager);

    // Manager accessing excluded module detail receives 404
    $this->getJson("/api/audit-logs/{$userModuleLog->id}")
        ->assertStatus(404);
});
