<?php

use App\Models\Ticket;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('ticket factory open state creates ticket with status_id 1', function () {
    $ticket = Ticket::factory()->open()->create();

    expect($ticket->status_id)->toBe(1);
    expect($ticket->technician_id)->toBeNull();
    expect($ticket->resolved_at)->toBeNull();
    expect($ticket->closed_at)->toBeNull();
});

test('ticket factory assigned state sets status and technician', function () {
    $ticket = Ticket::factory()->assigned()->create();

    expect($ticket->status_id)->toBe(2);
    expect($ticket->technician_id)->not->toBeNull();
});

test('ticket factory inProgress state sets status and technician', function () {
    $ticket = Ticket::factory()->inProgress()->create();

    expect($ticket->status_id)->toBe(3);
    expect($ticket->technician_id)->not->toBeNull();
});

test('ticket factory resolved state sets status and resolved_at', function () {
    $ticket = Ticket::factory()->resolved()->create();

    expect($ticket->status_id)->toBe(4);
    expect($ticket->resolved_at)->not->toBeNull();
});

test('ticket factory closed state sets status and closed_at', function () {
    $ticket = Ticket::factory()->closed()->create();

    expect($ticket->status_id)->toBe(5);
    expect($ticket->closed_at)->not->toBeNull();
});

test('ticket factory breached state sets sla breached attributes', function () {
    $ticket = Ticket::factory()->breached()->create();

    expect($ticket->sla_breached)->toBeTrue();
    expect($ticket->sla_breached_at)->not->toBeNull();
    expect($ticket->sla_deadline->isPast())->toBeTrue();
});
