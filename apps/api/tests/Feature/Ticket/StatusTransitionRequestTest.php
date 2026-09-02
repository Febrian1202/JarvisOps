<?php

use App\Models\Ticket;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket');

beforeEach(function () {
    $this->ticket = Ticket::factory()->open()->create();
    Sanctum::actingAs(User::factory()->manager()->create());
});

test('status transition requires valid status_id', function () {
    $this->postJson("/api/tickets/{$this->ticket->id}/status", ['status_id' => 99])
        ->assertStatus(422);
});

test('assign requires valid technician_id with role technician', function () {
    $this->postJson("/api/tickets/{$this->ticket->id}/assign", ['technician_id' => 999])
        ->assertStatus(422);
});

test('assign rejects non-technician user', function () {
    $employee = User::factory()->employee()->create();
    $this->postJson("/api/tickets/{$this->ticket->id}/assign", ['technician_id' => $employee->id])
        ->assertStatus(422)
        ->assertJsonPath('errors.technician_id.0', 'Teknisi yang dipilih tidak valid atau tidak aktif.');
});

test('priority change requires valid priority_id', function () {
    $this->postJson("/api/tickets/{$this->ticket->id}/priority", ['priority_id' => 99])
        ->assertStatus(422);
});

test('expected_status_id must be integer if provided', function () {
    $this->postJson("/api/tickets/{$this->ticket->id}/status", ['status_id' => 3, 'expected_status_id' => 'abc'])
        ->assertStatus(422);
});
