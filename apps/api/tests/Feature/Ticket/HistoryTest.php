<?php

use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket', 'history');

test('history shows human-readable values and ascending chronological order', function () {
    $reporter = User::factory()->employee()->create();
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();

    Sanctum::actingAs($reporter);
    $ticketResponse = $this->postJson('/api/tickets', [
        'title' => 'Printer Rusak',
        'description' => 'Paper jam terus menerus',
        'category_id' => TicketCategory::where('name', 'Printer')->first()->id,
        'priority_id' => 1,
    ])->assertStatus(201)->json('data');

    $ticketId = $ticketResponse['id'];

    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticketId}/assign", [
        'technician_id' => $technician->id,
    ])->assertStatus(200);

    Sanctum::actingAs($technician);
    $this->postJson("/api/tickets/{$ticketId}/status", [
        'status_id' => 3, // IN_PROGRESS
    ])->assertStatus(200);

    Sanctum::actingAs($reporter);
    $response = $this->getJson("/api/tickets/{$ticketId}/histories")
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Histories retrieved successfully.');

    $data = $response->json('data');
    expect($data)->toBeArray()->toHaveCount(4); // 1 create + 2 assign (status + tech) + 1 in_progress

    // Check first item: creation history
    expect($data[0]['field_changed'])->toBe('status_id');
    expect($data[0]['old_value'])->toBeNull();
    expect($data[0]['new_value'])->toBe('OPEN');
    expect($data[0]['user']['id'])->toBe($reporter->id);

    // Check last item: status change to IN_PROGRESS
    $last = end($data);
    expect($last['field_changed'])->toBe('status_id');
    expect($last['old_value'])->toBe('ASSIGNED');
    expect($last['new_value'])->toBe('IN_PROGRESS');
    expect($last['user']['id'])->toBe($technician->id);
});

test('non-participant employee cannot view ticket history and receives 404', function () {
    $reporter = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($other);
    $this->getJson("/api/tickets/{$ticket->id}/histories")
        ->assertStatus(404);
});

test('manager and admin can view any ticket history', function () {
    $reporter = User::factory()->employee()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($manager);
    $this->getJson("/api/tickets/{$ticket->id}/histories")->assertStatus(200);

    Sanctum::actingAs($admin);
    $this->getJson("/api/tickets/{$ticket->id}/histories")->assertStatus(200);
});
