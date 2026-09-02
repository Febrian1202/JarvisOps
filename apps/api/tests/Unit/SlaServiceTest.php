<?php

use App\Models\Ticket;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Services\Sla\SlaService;
use Carbon\CarbonInterface;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

test('calculateDeadline computes flat 24 7 deadline', function () {
    $service = new SlaService;
    $created = Carbon::parse('2026-08-31T10:00:00Z');

    $deadline = $service->calculateDeadline($created, 240);

    expect($deadline->toIso8601String())->toBe(Carbon::parse('2026-08-31T14:00:00Z')->toIso8601String());
});

test('calculateDeadline handles midnight wrap', function () {
    $service = new SlaService;
    $created = Carbon::parse('2026-08-31T23:00:00Z');

    $deadline = $service->calculateDeadline($created, 120);

    expect($deadline->toIso8601String())->toBe(Carbon::parse('2026-09-01T01:00:00Z')->toIso8601String());
});

test('snapshot assigns sla attributes without saving', function () {
    $service = new SlaService;
    $ticket = new Ticket;
    $priority = TicketPriority::find(2); // High: 240

    Carbon::setTestNow('2026-09-01T08:00:00Z');
    $service->snapshot($ticket, $priority);

    expect($ticket->sla_duration_minutes)->toBe(240);
    expect($ticket->sla_deadline instanceof CarbonInterface)->toBeTrue();
    expect($ticket->sla_deadline->equalTo(Carbon::parse('2026-09-01T12:00:00Z')))->toBeTrue();
    expect($ticket->exists)->toBeFalse();
    Carbon::setTestNow();
});

test('recalculateFromCreation calculates deadline from created_at', function () {
    $service = new SlaService;
    $ticket = new Ticket;
    $ticket->created_at = '2026-08-31T10:00:00Z';
    $newPriority = TicketPriority::find(1); // Critical: 120

    $service->recalculateFromCreation($ticket, $newPriority);

    expect($ticket->sla_duration_minutes)->toBe(120);
    expect(Carbon::parse($ticket->sla_deadline)->equalTo(Carbon::parse('2026-08-31T12:00:00Z')))->toBeTrue();
});

test('remainingMinutes returns null when resolved or closed', function () {
    $service = new SlaService;

    $resolvedTicket = new Ticket;
    $resolvedTicket->resolved_at = now();
    $resolvedTicket->sla_deadline = now()->addHour();

    $closedTicket = new Ticket;
    $closedTicket->closed_at = now();
    $closedTicket->sla_deadline = now()->addHour();

    expect($service->remainingMinutes($resolvedTicket))->toBeNull();
    expect($service->remainingMinutes($closedTicket))->toBeNull();
});

test('remainingMinutes returns signed integer and goes negative past deadline', function () {
    $service = new SlaService;

    Carbon::setTestNow('2026-09-01T10:00:00Z');

    $onTrack = new Ticket;
    $onTrack->sla_deadline = Carbon::parse('2026-09-01T10:30:00Z');
    expect($service->remainingMinutes($onTrack))->toBe(30);

    $breached = new Ticket;
    $breached->sla_deadline = Carbon::parse('2026-09-01T09:45:00Z');
    expect($service->remainingMinutes($breached))->toBe(-15);

    Carbon::setTestNow();
});

test('isBreached returns true defensively if sla_breached is true or deadline passed', function () {
    $service = new SlaService;
    Carbon::setTestNow('2026-09-01T10:00:00Z');

    $alreadyBreached = new Ticket;
    $alreadyBreached->sla_breached = true;
    expect($service->isBreached($alreadyBreached))->toBeTrue();

    $openStatus = TicketStatus::find(1); // OPEN, is_closed=false
    $resolvedStatus = TicketStatus::find(4); // RESOLVED, is_closed=true

    $overdueOpen = new Ticket;
    $overdueOpen->setRelation('status', $openStatus);
    $overdueOpen->sla_deadline = Carbon::parse('2026-09-01T09:59:00Z');
    expect($service->isBreached($overdueOpen))->toBeTrue();

    $overdueResolved = new Ticket;
    $overdueResolved->setRelation('status', $resolvedStatus);
    $overdueResolved->sla_deadline = Carbon::parse('2026-09-01T09:59:00Z');
    expect($service->isBreached($overdueResolved))->toBeFalse();

    Carbon::setTestNow();
});

test('breachCandidates query returns only active unbreached tickets past deadline', function () {
    $slaService = new SlaService;

    // 1. Tiket breach valid
    $t1 = Ticket::factory()->open()->create([
        'sla_breached' => false,
        'sla_deadline' => now()->subMinutes(10),
    ]);

    // 2. Tiket sudah ditandai breach sebelumnya (harus diabaikan)
    $t2 = Ticket::factory()->open()->create([
        'sla_breached' => true,
        'sla_deadline' => now()->subMinutes(10),
    ]);

    // 3. Tiket belum melewati deadline (harus diabaikan)
    $t3 = Ticket::factory()->open()->create([
        'sla_breached' => false,
        'sla_deadline' => now()->addMinutes(30),
    ]);

    // 4. Tiket resolved yang melewati deadline (harus diabaikan)
    $t4 = Ticket::factory()->resolved()->create([
        'sla_breached' => false,
        'sla_deadline' => now()->subMinutes(10),
    ]);

    $candidates = $slaService->breachCandidates()->pluck('id')->all();

    expect($candidates)->toContain($t1->id)
        ->and($candidates)->not->toContain($t2->id)
        ->and($candidates)->not->toContain($t3->id)
        ->and($candidates)->not->toContain($t4->id);
});
