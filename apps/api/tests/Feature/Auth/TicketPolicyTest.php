<?php

use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\TicketStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('viewAny is true for all authenticated users', function () {
    $user = User::factory()->employee()->create();
    expect(Gate::forUser($user)->allows('viewAny', Ticket::class))->toBeTrue();
});

test('view allows owner and technicians/managers/admins but denies other employees as not found', function () {
    $reporter = User::factory()->employee()->create();
    $otherEmployee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $ticket = Ticket::factory()->create(['reporter_id' => $reporter->id]);

    expect(Gate::forUser($reporter)->allows('view', $ticket))->toBeTrue();
    expect(Gate::forUser($technician)->allows('view', $ticket))->toBeTrue();
    expect(Gate::forUser($manager)->allows('view', $ticket))->toBeTrue();
    expect(Gate::forUser($admin)->allows('view', $ticket))->toBeTrue();

    $response = Gate::forUser($otherEmployee)->inspect('view', $ticket);
    expect($response->allowed())->toBeFalse();
    expect($response->status())->toBe(404);
});

test('update allows reporter on open ticket and rejects all on closed ticket', function () {
    $reporter = User::factory()->employee()->create();
    $manager = User::factory()->manager()->create();

    $openStatus = TicketStatus::find(1);
    $closedStatus = TicketStatus::find(5);

    $openTicket = Ticket::factory()->create([
        'reporter_id' => $reporter->id,
        'status_id' => 1,
    ]);
    $openTicket->setRelation('status', $openStatus);

    $closedTicket = Ticket::factory()->create([
        'reporter_id' => $reporter->id,
        'status_id' => 5,
    ]);
    $closedTicket->setRelation('status', $closedStatus);

    expect(Gate::forUser($reporter)->allows('update', $openTicket))->toBeTrue();
    expect(Gate::forUser($manager)->allows('update', $openTicket))->toBeTrue();

    expect(Gate::forUser($reporter)->allows('update', $closedTicket))->toBeFalse();
    expect(Gate::forUser($manager)->allows('update', $closedTicket))->toBeFalse();
});

test('assign and unassign allowed for manager and admin only', function () {
    $employee = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();
    $ticket = Ticket::factory()->create();

    expect(Gate::forUser($manager)->allows('assign', $ticket))->toBeTrue();
    expect(Gate::forUser($admin)->allows('assign', $ticket))->toBeTrue();
    expect(Gate::forUser($employee)->allows('assign', $ticket))->toBeFalse();
    expect(Gate::forUser($technician)->allows('assign', $ticket))->toBeFalse();

    expect(Gate::forUser($manager)->allows('unassign', $ticket))->toBeTrue();
    expect(Gate::forUser($admin)->allows('unassign', $ticket))->toBeTrue();
    expect(Gate::forUser($employee)->allows('unassign', $ticket))->toBeFalse();
    expect(Gate::forUser($technician)->allows('unassign', $ticket))->toBeFalse();
});

test('changePriority allowed for manager admin and assigned technician only', function () {
    $assignedTech = User::factory()->technician()->create();
    $otherTech = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $employee = User::factory()->employee()->create();

    $ticket = Ticket::factory()->create(['technician_id' => $assignedTech->id]);

    expect(Gate::forUser($assignedTech)->allows('changePriority', $ticket))->toBeTrue();
    expect(Gate::forUser($otherTech)->allows('changePriority', $ticket))->toBeFalse();
    expect(Gate::forUser($manager)->allows('changePriority', $ticket))->toBeTrue();
    expect(Gate::forUser($employee)->allows('changePriority', $ticket))->toBeFalse();
});

test('comment and attach only allow participants', function () {
    $reporter = User::factory()->employee()->create();
    $tech = User::factory()->technician()->create();
    $otherTech = User::factory()->technician()->create();
    $otherEmployee = User::factory()->employee()->create();

    $ticket = Ticket::factory()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $tech->id,
    ]);

    expect(Gate::forUser($reporter)->allows('comment', $ticket))->toBeTrue();
    expect(Gate::forUser($tech)->allows('comment', $ticket))->toBeTrue();
    expect(Gate::forUser($otherTech)->allows('comment', $ticket))->toBeFalse();

    $denied = Gate::forUser($otherEmployee)->inspect('comment', $ticket);
    expect($denied->allowed())->toBeFalse();
    expect($denied->status())->toBe(404);
});

test('delete allowed for admin only', function () {
    $admin = User::factory()->admin()->create();
    $manager = User::factory()->manager()->create();
    $ticket = Ticket::factory()->create();

    expect(Gate::forUser($admin)->allows('delete', $ticket))->toBeTrue();
    expect(Gate::forUser($manager)->allows('delete', $ticket))->toBeFalse();
});

test('ticket comment policy allows author within 15 minutes and admin anytime', function () {
    $author = User::factory()->employee()->create();
    $otherUser = User::factory()->employee()->create();
    $admin = User::factory()->admin()->create();
    $ticket = Ticket::factory()->create();

    $freshComment = TicketComment::create([
        'ticket_id' => $ticket->id,
        'user_id' => $author->id,
        'body' => 'Fresh comment',
    ]);

    expect(Gate::forUser($author)->allows('update', $freshComment))->toBeTrue();
    expect(Gate::forUser($otherUser)->allows('update', $freshComment))->toBeFalse();
    expect(Gate::forUser($admin)->allows('update', $freshComment))->toBeTrue();

    // Expired comment (> 15 minutes)
    $expiredComment = TicketComment::factory()->create([
        'ticket_id' => $ticket->id,
        'user_id' => $author->id,
        'body' => 'Old comment',
        'created_at' => now()->subMinutes(20),
    ]);

    expect(Gate::forUser($author)->allows('update', $expiredComment))->toBeFalse();
    expect(Gate::forUser($admin)->allows('update', $expiredComment))->toBeTrue();
});
