<?php

use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket');

// --- Step 1: Golden Path (§31 Scenarios 1-5) ---

test('full lifecycle over HTTP', function () {
    $employee = User::factory()->employee()->create();
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();

    Sanctum::actingAs($employee);
    $ticket = $this->postJson('/api/tickets', [
        'title' => 'Laptop mati',
        'description' => 'Tidak boot',
        'category_id' => TicketCategory::where('name', 'Laptop')->first()->id,
        'priority_id' => 1,
    ])->assertStatus(201)
        ->assertJsonPath('data.status.name', 'OPEN')
        ->assertJsonPath('data.reporter.id', $employee->id)
        ->json('data');
    $id = $ticket['id'];

    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$id}/assign", ['technician_id' => $technician->id])
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'ASSIGNED')
        ->assertJsonPath('data.technician.id', $technician->id);

    Sanctum::actingAs($technician);
    $this->postJson("/api/tickets/{$id}/status", ['status_id' => 3])
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'IN_PROGRESS');

    $this->postJson("/api/tickets/{$id}/status", ['status_id' => 4])
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'RESOLVED')
        ->assertJsonPath('data.resolved_at', fn ($v) => $v !== null);

    Sanctum::actingAs($employee);
    $this->postJson("/api/tickets/{$id}/status", ['status_id' => 5])
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'CLOSED')
        ->assertJsonPath('data.closed_at', fn ($v) => $v !== null);
});

// --- Step 2: Illegal Transitions over HTTP ---

test('OPEN to RESOLVED returns 422 with Indonesian message', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 4])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari OPEN ke RESOLVED.');
});

test('ASSIGNED to RESOLVED returns 422 with Indonesian message', function () {
    $ticket = Ticket::factory()->assigned()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 4])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari ASSIGNED ke RESOLVED.');
});

test('same status transition returns 422 with Indonesian message', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 1])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari OPEN ke OPEN.');
});

test('CLOSED to IN_PROGRESS returns 422 with Indonesian message', function () {
    $ticket = Ticket::factory()->closed()->create();
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari CLOSED ke IN_PROGRESS.');
});

test('RESOLVED to OPEN returns 422 with Indonesian message', function () {
    $ticket = Ticket::factory()->resolved()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 1])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari RESOLVED ke OPEN.');
});

test('IN_PROGRESS to OPEN returns 422 with Indonesian message', function () {
    $ticket = Ticket::factory()->inProgress()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 1])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari IN_PROGRESS ke OPEN.');
});

test('transition to ASSIGNED via status endpoint returns 422', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 2])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari OPEN ke ASSIGNED melalui endpoint ini.');
});

// --- Step 3: Concurrency 409 vs 422 vs 403/404 (D-26) ---

test('stale expected_status_id returns 409', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 3,
        'expected_status_id' => 3,
    ])
        ->assertStatus(409)
        ->assertJsonPath('message', 'Ticket status has changed since it was loaded. Please refresh and try again.');
});

test('stale expected_status_id with illegal transition returns 409 not 422', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 2,
        'expected_status_id' => 2,
    ])
        ->assertStatus(409);
});

test('unauthorized user with stale expected_status_id returns 403/404 not 409', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->employee()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 3,
        'expected_status_id' => 3,
    ])
        ->assertStatus(404);
});

// --- Step 4: Self-assign, Reopen, Priority, Cancel via HTTP ---

test('technician self-assigns via HTTP with two history rows', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);
    Sanctum::actingAs($technician);

    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'IN_PROGRESS')
        ->assertJsonPath('data.technician.id', $technician->id);

    expect($ticket->fresh()->histories()->count())->toBe(2);
});

test('reopen preserves sla_deadline and sla_breached', function () {
    $employee = User::factory()->employee()->create();
    $ticket = Ticket::factory()->resolved()->breached()->create(['reporter_id' => $employee->id]);
    $deadline = $ticket->sla_deadline;
    Sanctum::actingAs($employee);

    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
        ->assertStatus(200);

    $t = $ticket->fresh();
    expect($t->resolved_at)->toBeNull();
    expect($t->sla_deadline->equalTo($deadline))->toBeTrue();
    expect($t->sla_breached)->toBeTrue();
});

test('cancel from IN_PROGRESS without note returns 422', function () {
    $ticket = Ticket::factory()->inProgress()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 5])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Status tidak dapat diubah dari IN_PROGRESS ke CLOSED tanpa alasan. Sertakan note untuk membatalkan ticket.');
});

test('cancel from IN_PROGRESS with note succeeds and creates comment', function () {
    $ticket = Ticket::factory()->inProgress()->create();
    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 5,
        'note' => 'Dibatalkan oleh user',
    ])
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'CLOSED');

    expect($ticket->fresh()->comments()->where('body', 'Dibatalkan oleh user')->exists())->toBeTrue();
});

test('priority change recalculates sla_deadline from created_at', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $newPriority = TicketPriority::find(1); // 120 menit
    $this->postJson("/api/tickets/{$ticket->id}/priority", ['priority_id' => 1])
        ->assertStatus(200)
        ->assertJsonPath('data.priority.id', 1);

    $t = $ticket->fresh();
    expect($t->sla_deadline->equalTo($t->created_at->copy()->addMinutes($newPriority->sla_minutes)))->toBeTrue();
});

test('priority change on closed ticket returns 422', function () {
    $ticket = Ticket::factory()->closed()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/priority", ['priority_id' => 1])
        ->assertStatus(422)
        ->assertJsonPath('errors.status_id.0', 'Prioritas tidak dapat diubah pada ticket yang sudah ditutup/diresolusi.');
});

// --- Step 5: Authorization & Protective Rules (D-16, D-17, D-19) ---

test('admin cannot reopen CLOSED ticket', function () {
    $ticket = Ticket::factory()->closed()->create();
    Sanctum::actingAs(User::factory()->admin()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
        ->assertStatus(422);
});

test('technician cannot close own RESOLVED ticket', function () {
    $technician = User::factory()->technician()->create();
    $ticket = Ticket::factory()->resolved()->create(['technician_id' => $technician->id]);
    Sanctum::actingAs($technician);
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 5])
        ->assertStatus(422);
});

test('employee non-reporter changing status gets 404', function () {
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->employee()->create());
    $this->postJson("/api/tickets/{$ticket->id}/status", ['status_id' => 3])
        ->assertStatus(404);
});

test('manager assigning non-technician gets 422', function () {
    $employee = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
    $this->postJson("/api/tickets/{$ticket->id}/assign", ['technician_id' => $employee->id])
        ->assertStatus(422)
        ->assertJsonPath('errors.technician_id.0', 'Teknisi yang dipilih tidak valid atau tidak aktif.');
});

test('manager unassigns ticket via HTTP', function () {
    $ticket = Ticket::factory()->assigned()->create();
    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->postJson("/api/tickets/{$ticket->id}/unassign")
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'OPEN')
        ->assertJsonPath('data.technician', null);

    $t = $ticket->fresh();
    expect($t->status_id)->toBe(1);
    expect($t->technician_id)->toBeNull();
});

test('technician cannot unassign ticket', function () {
    $technician = User::factory()->technician()->create();
    $ticket = Ticket::factory()->assigned()->create(['technician_id' => $technician->id]);
    Sanctum::actingAs($technician);

    $this->postJson("/api/tickets/{$ticket->id}/unassign")
        ->assertStatus(403);
});

// --- Step 6: Detail available_actions & editable_fields via HTTP ---

test('show returns available_actions for manager on OPEN ticket', function () {
    $manager = User::factory()->manager()->create();
    $ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs($manager);
    $this->getJson("/api/tickets/{$ticket->id}")
        ->assertOk()
        ->assertJsonPath('data.available_actions', ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit'])
        ->assertJsonPath('data.editable_fields', ['title', 'description', 'category_id']);
});

test('show returns available_actions for technician pemegang on IN_PROGRESS ticket', function () {
    $technician = User::factory()->technician()->create();
    $ticket = Ticket::factory()->inProgress()->create(['technician_id' => $technician->id]);
    Sanctum::actingAs($technician);
    $this->getJson("/api/tickets/{$ticket->id}")
        ->assertOk()
        ->assertJsonPath('data.available_actions', ['resolve', 'change_priority', 'comment', 'attach', 'edit'])
        ->assertJsonPath('data.editable_fields', ['title', 'description', 'category_id']);
});

test('show returns available_actions for employee reporter on RESOLVED ticket', function () {
    $employee = User::factory()->employee()->create();
    $ticket = Ticket::factory()->resolved()->create(['reporter_id' => $employee->id]);
    Sanctum::actingAs($employee);
    $this->getJson("/api/tickets/{$ticket->id}")
        ->assertOk()
        ->assertJsonPath('data.available_actions', ['close', 'reopen', 'comment', 'attach', 'edit'])
        ->assertJsonPath('data.editable_fields', ['title', 'description']);
});

test('show returns empty available_actions and editable_fields on CLOSED ticket', function () {
    $admin = User::factory()->admin()->create();
    $ticket = Ticket::factory()->closed()->create();
    Sanctum::actingAs($admin);
    $this->getJson("/api/tickets/{$ticket->id}")
        ->assertOk()
        ->assertJsonPath('data.available_actions', [])
        ->assertJsonPath('data.editable_fields', []);
});
