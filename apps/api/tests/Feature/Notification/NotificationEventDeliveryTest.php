<?php

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('ticket assignment notifies technician and excludes assigning manager', function () {
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticket->id}/assign", ['technician_id' => $technician->id])
        ->assertStatus(200);

    expect(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketAssigned->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $manager->id)->exists())->toBeFalse();
});

test('ticket reassignment notifies both new and old technician and excludes manager', function () {
    $manager = User::factory()->manager()->create();
    $oldTech = User::factory()->technician()->create();
    $newTech = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->assigned()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $oldTech->id,
    ]);

    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticket->id}/assign", ['technician_id' => $newTech->id])
        ->assertStatus(200);

    expect(Notification::where('user_id', $newTech->id)->where('type', NotificationType::TicketReassigned->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $oldTech->id)->where('type', NotificationType::TicketReassigned->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $manager->id)->exists())->toBeFalse();
});

test('ticket unassign notifies previous technician and excludes manager', function () {
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->assigned()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticket->id}/unassign")
        ->assertStatus(200);

    expect(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketUnassigned->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $manager->id)->exists())->toBeFalse();
});

test('ticket status change to in progress notifies reporter and excludes technician actor', function () {
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->assigned()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($technician);
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 3,
    ])->assertStatus(200);

    expect(Notification::where('user_id', $reporter->id)->where('type', NotificationType::TicketStatusChanged->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $technician->id)->exists())->toBeFalse();
});

test('ticket self assignment notifies reporter and excludes technician actor', function () {
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($technician);
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 3,
    ])->assertStatus(200);

    expect(Notification::where('user_id', $reporter->id)->where('type', NotificationType::TicketSelfAssigned->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $technician->id)->exists())->toBeFalse();
});

test('ticket reopen notifies technician and all active managers and excludes reporter actor', function () {
    $manager1 = User::factory()->manager()->create();
    $manager2 = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->resolved()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($reporter);
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 3,
        'note' => 'Masalah masih muncul kembali setelah restart.',
    ])->assertStatus(200);

    expect(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketReopened->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $manager1->id)->where('type', NotificationType::TicketReopened->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $manager2->id)->where('type', NotificationType::TicketReopened->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $reporter->id)->exists())->toBeFalse();
});

test('ticket resolve notifies reporter and excludes technician actor', function () {
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->inProgress()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($technician);
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 4,
        'note' => 'Telah diganti kabel power baru.',
    ])->assertStatus(200);

    expect(Notification::where('user_id', $reporter->id)->where('type', NotificationType::TicketResolved->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $technician->id)->exists())->toBeFalse();
});

test('ticket close notifies technician and excludes reporter actor', function () {
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->resolved()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($reporter);
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 5,
    ])->assertStatus(200);

    expect(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketClosed->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketClosed->value)->count())->toBe(1)
        ->and(Notification::where('user_id', $reporter->id)->exists())->toBeFalse();
});

test('ticket cancel notifies reporter and technician and excludes manager actor', function () {
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();
    $reporter = User::factory()->employee()->create();

    $ticket = Ticket::factory()->inProgress()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticket->id}/status", [
        'status_id' => 5,
        'note' => 'Dibatalkan karena duplikasi permintaan.',
    ])->assertStatus(200);

    expect(Notification::where('user_id', $reporter->id)->where('type', NotificationType::TicketCancelled->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketCancelled->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $manager->id)->exists())->toBeFalse();
});

test('ticket comment notifies other participants and excludes author', function () {
    $reporter = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $ticket = Ticket::factory()->assigned()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($reporter);
    $this->postJson("/api/tickets/{$ticket->id}/comments", ['body' => 'Ada update baru?'])
        ->assertStatus(201);

    expect(Notification::where('user_id', $technician->id)->where('type', NotificationType::TicketCommented->value)->exists())->toBeTrue()
        ->and(Notification::where('user_id', $reporter->id)->exists())->toBeFalse();
});
