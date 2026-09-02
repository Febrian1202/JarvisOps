<?php

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;

uses(RefreshDatabase::class);

test('artisan tickets:check-sla marks breached tickets with time travel', function () {
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();

    // Buat tiket dengan SLA deadline 2 jam dari sekarang
    $ticket = Ticket::factory()->create([
        'status_id' => 2,
        'technician_id' => $technician->id,
        'sla_duration_minutes' => 120,
        'sla_deadline' => now()->addMinutes(120),
        'sla_breached' => false,
    ]);

    // Majukan waktu 3 jam ke masa depan (melewati deadline)
    $this->travel(3)->hours();

    Artisan::call('tickets:check-sla');

    $ticket->refresh();
    expect($ticket->sla_breached)->toBeTrue()
        ->and($ticket->sla_breached_at)->not->toBeNull();

    expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())
        ->toBe(2); // 1 technician + 1 manager
});

test('artisan tickets:check-sla is idempotent and does not send duplicate notifications on second run', function () {
    $manager = User::factory()->manager()->create();
    $ticket = Ticket::factory()->open()->create([
        'sla_deadline' => now()->subMinutes(10),
        'sla_breached' => false,
    ]);

    Artisan::call('tickets:check-sla');
    expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())->toBe(1);

    // Jalankan kedua kali
    Artisan::call('tickets:check-sla');
    expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())->toBe(1);
});

test('resolved ticket past deadline is never marked breached by scheduler', function () {
    $manager = User::factory()->manager()->create();
    $ticket = Ticket::factory()->resolved()->create([
        'sla_deadline' => now()->subMinutes(10),
        'sla_breached' => false,
    ]);

    Artisan::call('tickets:check-sla');

    $ticket->refresh();
    expect($ticket->sla_breached)->toBeFalse();
    expect(Notification::where('type', NotificationType::TicketSlaBreached->value)->count())->toBe(0);
});
