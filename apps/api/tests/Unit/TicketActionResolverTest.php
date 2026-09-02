<?php

use App\Models\Ticket;
use App\Models\User;
use App\Services\Ticket\TicketActionResolver;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

dataset('availableActionMatrix', function () {
    return [
        // OPEN
        ['open', ['role' => 'admin'], ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
        ['open', ['role' => 'manager'], ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
        ['open', ['role' => 'technician', 'as_technician' => true], []], // pemegang (though open has no technician normally)
        ['open', ['role' => 'technician', 'as_technician' => false], ['start']], // bukan pemegang
        ['open', ['role' => 'employee', 'as_reporter' => true], ['comment', 'attach', 'edit']],

        // ASSIGNED
        ['assigned', ['role' => 'admin'], ['assign', 'unassign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
        ['assigned', ['role' => 'manager'], ['assign', 'unassign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
        ['assigned', ['role' => 'technician', 'as_technician' => true], ['start', 'change_priority', 'comment', 'attach', 'edit']],
        ['assigned', ['role' => 'technician', 'as_technician' => false], []],
        ['assigned', ['role' => 'employee', 'as_reporter' => true], ['comment', 'attach', 'edit']],

        // IN_PROGRESS
        ['inProgress', ['role' => 'admin'], ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
        ['inProgress', ['role' => 'manager'], ['assign', 'cancel', 'change_priority', 'comment', 'attach', 'edit']],
        ['inProgress', ['role' => 'technician', 'as_technician' => true], ['resolve', 'change_priority', 'comment', 'attach', 'edit']],
        ['inProgress', ['role' => 'technician', 'as_technician' => false], []],
        ['inProgress', ['role' => 'employee', 'as_reporter' => true], ['comment', 'attach', 'edit']],

        // RESOLVED
        ['resolved', ['role' => 'admin'], ['close', 'reopen', 'comment', 'attach', 'edit']],
        ['resolved', ['role' => 'manager'], ['close', 'reopen', 'comment', 'attach', 'edit']],
        ['resolved', ['role' => 'technician', 'as_technician' => true], ['reopen', 'comment', 'attach', 'edit']],
        ['resolved', ['role' => 'technician', 'as_technician' => false], []],
        ['resolved', ['role' => 'employee', 'as_reporter' => true], ['close', 'reopen', 'comment', 'attach', 'edit']],

        // CLOSED
        ['closed', ['role' => 'admin'], []],
        ['closed', ['role' => 'manager'], []],
        ['closed', ['role' => 'technician', 'as_technician' => true], []],
        ['closed', ['role' => 'technician', 'as_technician' => false], []],
        ['closed', ['role' => 'employee', 'as_reporter' => true], []],
    ];
});

test('available_actions matches STATUS-TRANSITION §9 matrix', function ($statusState, $roleSetup, $expected) {
    $user = User::factory()->{$roleSetup['role']}()->create();

    $reporterId = ($roleSetup['as_reporter'] ?? false)
        ? $user->id
        : User::factory()->employee()->create()->id;

    $ticket = Ticket::factory()->{$statusState}()->create(['reporter_id' => $reporterId]);

    if ($roleSetup['as_technician'] ?? false) {
        $ticket->technician_id = $user->id;
        $ticket->save();
    } elseif ($roleSetup['role'] === 'technician') {
        // bukan pemegang: ensure technician_id is either someone else or null
        if ($ticket->technician_id === $user->id) {
            $ticket->technician_id = User::factory()->technician()->create()->id;
            $ticket->save();
        }
    }

    $resolver = app(TicketActionResolver::class);
    expect($resolver->availableActions($ticket, $user))->toEqual($expected);
})->with('availableActionMatrix');

test('editable_fields differ per role and empty on CLOSED', function () {
    $resolver = app(TicketActionResolver::class);

    $admin = User::factory()->admin()->create();
    $manager = User::factory()->manager()->create();
    $tech = User::factory()->technician()->create();
    $employeeReporter = User::factory()->employee()->create();
    $employeeOther = User::factory()->employee()->create();

    // OPEN ticket
    $openTicket = Ticket::factory()->open()->create(['reporter_id' => $employeeReporter->id]);
    expect($resolver->editableFields($openTicket, $employeeReporter))->toBe(['title', 'description']);
    expect($resolver->editableFields($openTicket, $admin))->toBe(['title', 'description', 'category_id']);
    expect($resolver->editableFields($openTicket, $manager))->toBe(['title', 'description', 'category_id']);
    expect($resolver->editableFields($openTicket, $tech))->toBe(['title', 'description', 'category_id']);
    expect($resolver->editableFields($openTicket, $employeeOther))->toBe([]);

    // RESOLVED ticket (editable_fields still available for participants)
    $resolvedTicket = Ticket::factory()->resolved()->create(['reporter_id' => $employeeReporter->id]);
    expect($resolver->editableFields($resolvedTicket, $employeeReporter))->toBe(['title', 'description']);
    expect($resolver->editableFields($resolvedTicket, $admin))->toBe(['title', 'description', 'category_id']);
    expect($resolver->editableFields($resolvedTicket, $manager))->toBe(['title', 'description', 'category_id']);
    expect($resolver->editableFields($resolvedTicket, $tech))->toBe(['title', 'description', 'category_id']);
    expect($resolver->editableFields($resolvedTicket, $employeeOther))->toBe([]);

    // CLOSED ticket -> all empty
    $closedTicket = Ticket::factory()->closed()->create(['reporter_id' => $employeeReporter->id]);
    expect($resolver->editableFields($closedTicket, $employeeReporter))->toBe([]);
    expect($resolver->editableFields($closedTicket, $admin))->toBe([]);
    expect($resolver->editableFields($closedTicket, $manager))->toBe([]);
    expect($resolver->editableFields($closedTicket, $tech))->toBe([]);
    expect($resolver->editableFields($closedTicket, $employeeOther))->toBe([]);
});
