<?php

use App\Enums\NotificationType;
use App\Models\Notification;
use App\Models\User;
use App\Services\Notification\NotificationService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('notify creates a valid unread notification row', function () {
    $user = User::factory()->employee()->create();
    $service = app(NotificationService::class);

    $payload = [
        'ticket_id' => 12,
        'ticket_number' => 'TCK-0012',
        'title' => 'Laptop mati',
        'actor_name' => 'Manager Dewi',
        'message' => 'Ticket #TCK-0012 telah ditugaskan kepada Anda.',
        'url' => '/tickets/12',
    ];

    $notif = $service->notify($user, NotificationType::TicketAssigned, $payload);

    expect($notif->exists)->toBeTrue();
    expect($notif->user_id)->toBe($user->id);
    expect($notif->type)->toBe('TICKET_ASSIGNED');
    expect($notif->is_read)->toBeFalse();
    expect($notif->data)->toBe($payload);
});

test('notifyMany skips actor and deduplicates recipients', function () {
    $service = app(NotificationService::class);

    $actor = User::factory()->manager()->create();
    $recipient1 = User::factory()->technician()->create();
    $recipient2 = User::factory()->employee()->create();

    $recipients = collect([$recipient1, $recipient2, $recipient1, $actor]);

    $payload = [
        'ticket_id' => 12,
        'ticket_number' => 'TCK-0012',
        'title' => 'Laptop mati',
        'actor_name' => $actor->full_name,
        'message' => 'Status berubah.',
        'url' => '/tickets/12',
    ];

    $service->notifyMany($recipients, NotificationType::TicketStatusChanged, $payload, $actor);

    expect(Notification::count())->toBe(2);
    expect(Notification::where('user_id', $actor->id)->exists())->toBeFalse();
    expect(Notification::where('user_id', $recipient1->id)->count())->toBe(1);
    expect(Notification::where('user_id', $recipient2->id)->count())->toBe(1);
});
