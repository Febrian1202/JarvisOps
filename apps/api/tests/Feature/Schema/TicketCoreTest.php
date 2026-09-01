<?php

use App\Enums\RoleName;
use App\Models\Department;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\TicketCategory;
use App\Models\TicketComment;
use App\Models\TicketHistory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('ticket core models and relations work properly', function () {
    $role = Role::create(['name' => RoleName::Employee->value]);
    $dept = Department::create(['name' => 'Finance']);
    $user = User::create([
        'role_id' => $role->id,
        'department_id' => $dept->id,
        'email' => 'reporter@jarvisops.test',
        'password' => 'secret123',
        'full_name' => 'Ticket Reporter',
    ]);

    $category = TicketCategory::create(['name' => 'Network']);
    $priority = TicketPriority::create(['name' => 'High', 'sla_minutes' => 240]);
    $status = TicketStatus::create(['name' => 'OPEN']);

    $ticket = Ticket::create([
        'ticket_number' => 'TCK-20260901-0001',
        'title' => 'WiFi issue',
        'description' => 'Cannot connect to office WiFi',
        'category_id' => $category->id,
        'priority_id' => $priority->id,
        'status_id' => $status->id,
        'reporter_id' => $user->id,
        'department_id' => $dept->id,
        'sla_duration_minutes' => 240,
        'sla_deadline' => now()->addMinutes(240),
    ]);

    $comment = TicketComment::create([
        'ticket_id' => $ticket->id,
        'user_id' => $user->id,
        'body' => 'Still waiting for connection',
    ]);

    $attachment = TicketAttachment::create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $user->id,
        'original_filename' => 'screenshot.png',
        'stored_filename' => 'uuid.png',
        'mime_type' => 'image/png',
        'file_size' => 10240,
        'storage_path' => 'attachments/uuid.png',
    ]);

    $history = TicketHistory::create([
        'ticket_id' => $ticket->id,
        'user_id' => $user->id,
        'field_changed' => 'status',
        'old_value' => null,
        'new_value' => 'OPEN',
    ]);

    expect($ticket->reporter->id)->toBe($user->id)
        ->and($ticket->category->id)->toBe($category->id)
        ->and($ticket->priority->id)->toBe($priority->id)
        ->and($ticket->status->id)->toBe($status->id)
        ->and($ticket->comments)->toHaveCount(1)
        ->and($ticket->attachments)->toHaveCount(1)
        ->and($ticket->histories)->toHaveCount(1)
        ->and($comment->ticket->id)->toBe($ticket->id)
        ->and($attachment->uploader->id)->toBe($user->id)
        ->and($history->ticket->id)->toBe($ticket->id);
});
