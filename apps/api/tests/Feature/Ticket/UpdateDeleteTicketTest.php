<?php

use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket');

beforeEach(function () {
    $this->employee = User::factory()->employee()->create();
    Sanctum::actingAs($this->employee);
});

test('employee updates title and description only', function () {
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $this->employee->id]);
    $originalCategoryId = $ticket->category_id;

    $this->putJson("/api/tickets/{$ticket->id}", [
        'title' => 'Updated Title',
        'description' => 'Updated Description',
        'category_id' => TicketCategory::where('name', 'Laptop')->first()->id,
    ])->assertStatus(200);

    $ticket->refresh();
    expect($ticket->title)->toBe('Updated Title');
    expect($ticket->description)->toBe('Updated Description');
    expect($ticket->category_id)->toBe($originalCategoryId);
});

test('technician can update category_id', function () {
    $technician = User::factory()->technician()->create();
    $ticket = Ticket::factory()->open()->withTechnician()->create(['technician_id' => $technician->id]);
    Sanctum::actingAs($technician);

    $laptopCategory = TicketCategory::where('name', 'Laptop')->first()->id;

    $this->putJson("/api/tickets/{$ticket->id}", [
        'category_id' => $laptopCategory,
    ])->assertStatus(200);

    $ticket->refresh();
    expect($ticket->category_id)->toBe($laptopCategory);
});

test('nobody can edit a CLOSED ticket', function () {
    $ticket = Ticket::factory()->closed()->create(['reporter_id' => $this->employee->id]);

    $this->putJson("/api/tickets/{$ticket->id}", [
        'title' => 'Should not work',
    ])->assertStatus(403);
});

test('admin cannot edit a CLOSED ticket', function () {
    $admin = User::factory()->admin()->create();
    $ticket = Ticket::factory()->closed()->create(['reporter_id' => $this->employee->id]);
    Sanctum::actingAs($admin);

    $this->putJson("/api/tickets/{$ticket->id}", [
        'title' => 'Admin try',
    ])->assertStatus(403);
});

test('employee can edit RESOLVED ticket', function () {
    $ticket = Ticket::factory()->resolved()->create(['reporter_id' => $this->employee->id]);

    $this->putJson("/api/tickets/{$ticket->id}", ['title' => 'Fixed typo'])
        ->assertStatus(200);
    expect($ticket->fresh()->title)->toBe('Fixed typo');
});

test('update rejects status_id and technician_id in payload', function () {
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $this->employee->id]);

    $this->putJson("/api/tickets/{$ticket->id}", [
        'title' => 'Test',
        'status_id' => 3,
        'technician_id' => 999,
    ])->assertStatus(422)
        ->assertJsonPath('errors.status_id', ['Status tiket tidak dapat diubah lewat update umum.']);
});

test('delete soft-deletes ticket', function () {
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $this->employee->id]);
    $ticketId = $ticket->id;

    $this->deleteJson("/api/tickets/{$ticket->id}")->assertStatus(403);

    // Admin can delete
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $this->deleteJson("/api/tickets/{$ticketId}")->assertStatus(200);
    expect(Ticket::withTrashed()->find($ticketId))->not->toBeNull();
});

test('non-admin cannot delete', function () {
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $this->employee->id]);

    $this->deleteJson("/api/tickets/{$ticket->id}")->assertStatus(403);

    // Also test technician cannot delete
    $technician = User::factory()->technician()->create();
    Sanctum::actingAs($technician);
    $this->deleteJson("/api/tickets/{$ticket->id}")->assertStatus(403);
});
