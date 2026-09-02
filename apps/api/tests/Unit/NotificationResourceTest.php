<?php

use App\Http\Resources\Notification\NotificationResource;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('NotificationResource formats data correctly matching API contract', function () {
    $user = User::factory()->employee()->create();
    $notif = Notification::factory()->create([
        'user_id' => $user->id,
        'type' => 'TICKET_ASSIGNED',
        'data' => [
            'ticket_id' => 12,
            'ticket_number' => 'TCK-0012',
            'title' => 'Laptop tidak menyala',
            'actor_name' => 'Manager Dewi',
            'message' => 'Ticket #TCK-0012 telah ditugaskan kepada Anda.',
            'url' => '/tickets/12',
        ],
        'is_read' => false,
        'read_at' => null,
    ]);

    $resource = (new NotificationResource($notif))->resolve();

    expect($resource['id'])->toBe($notif->id)
        ->and($resource['type'])->toBe('TICKET_ASSIGNED')
        ->and($resource['data']['ticket_number'])->toBe('TCK-0012')
        ->and($resource['is_read'])->toBeFalse()
        ->and($resource['read_at'])->toBeNull()
        ->and($resource['created_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/');
});
