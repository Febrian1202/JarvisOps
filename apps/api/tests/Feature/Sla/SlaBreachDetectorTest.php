<?php

use App\Enums\NotificationType;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Sla\SlaBreachDetector;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('scan processes candidate, marks breached, notifies technician and all managers, and logs audit', function () {
    $manager1 = User::factory()->manager()->create();
    $manager2 = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();

    $ticket = Ticket::factory()->create([
        'status_id' => 2,
        'technician_id' => $technician->id,
        'sla_breached' => false,
        'sla_deadline' => now()->subMinutes(15),
    ]);

    $detector = app(SlaBreachDetector::class);
    $result = $detector->scan();

    expect($result->breachedCount)->toBe(1);

    // Verifikasi tiket ter-update di database
    $ticket->refresh();
    expect($ticket->sla_breached)->toBeTrue()
        ->and($ticket->sla_breached_at)->not->toBeNull();

    // Verifikasi notifikasi sampai ke teknisi + 2 manager (total 3 notifikasi)
    $notifs = Notification::where('type', NotificationType::TicketSlaBreached->value)->get();
    expect($notifs)->toHaveCount(3)
        ->and($notifs->pluck('user_id')->all())->toContain($technician->id, $manager1->id, $manager2->id);

    $payload = $notifs->first()->data;
    expect($payload['actor_name'])->toBe('Sistem')
        ->and($payload['ticket_number'])->toBe($ticket->ticket_number)
        ->and($payload['url'])->toBe("/tickets/{$ticket->id}");

    // Verifikasi audit log tercatat dengan user_id null
    $audit = AuditLog::where('action', 'sla_breach')->first();
    expect($audit)->not->toBeNull()
        ->and($audit->user_id)->toBeNull()
        ->and($audit->module)->toBe('ticket')
        ->and($audit->module_id)->toBe($ticket->id);
});

test('scan on unassigned ticket notifies only managers without error', function () {
    $manager = User::factory()->manager()->create();
    $ticket = Ticket::factory()->open()->create([
        'technician_id' => null,
        'sla_breached' => false,
        'sla_deadline' => now()->subMinutes(5),
    ]);

    $detector = app(SlaBreachDetector::class);
    $result = $detector->scan();

    expect($result->breachedCount)->toBe(1);

    $notifs = Notification::where('type', NotificationType::TicketSlaBreached->value)->get();
    expect($notifs)->toHaveCount(1)
        ->and($notifs->first()->user_id)->toBe($manager->id);
});
