<?php

use App\Authorization\TicketActorResolver;
use App\DTOs\Ticket\AssignTicketData;
use App\DTOs\Ticket\ChangePriorityData;
use App\DTOs\Ticket\StatusTransitionData;
use App\Enums\AuditAction;
use App\Enums\NotificationType;
use App\Enums\TicketActor;
use App\Exceptions\IllegalStatusTransitionException;
use App\Exceptions\StateConflictException;
use App\Models\AuditLog;
use App\Models\Notification;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\TicketHistory;
use App\Models\User;
use App\Services\Notification\NotificationService;
use App\Services\Ticket\TicketStatusService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;

uses(RefreshDatabase::class);

// ── Step 1: TicketActorResolver — unit ──────────────────────────────────

describe('TicketActorResolver', function () {
    test('admin resolves to Admin only', function () {
        $user = User::factory()->admin()->create();
        $ticket = Ticket::factory()->open()->create();

        $roles = app(TicketActorResolver::class)->resolve($ticket, $user);

        expect($roles)->toBe([TicketActor::Admin]);
    });

    test('manager resolves to Manager only', function () {
        $user = User::factory()->manager()->create();
        $ticket = Ticket::factory()->open()->create();

        expect(app(TicketActorResolver::class)->resolve($ticket, $user))
            ->toEqual([TicketActor::Manager]);
    });

    test('assigned technician resolves to Technician and AnyTechnician', function () {
        $user = User::factory()->technician()->create();
        $ticket = Ticket::factory()->open()->create(['technician_id' => $user->id]);

        $roles = app(TicketActorResolver::class)->resolve($ticket, $user);

        expect($roles)->toHaveCount(2);
        expect($roles)->toContain(TicketActor::Technician);
        expect($roles)->toContain(TicketActor::AnyTechnician);
    });

    test('non-assigned technician resolves to AnyTechnician only', function () {
        $technician = User::factory()->technician()->create();
        $other = User::factory()->technician()->create();
        $ticket = Ticket::factory()->open()->create(['technician_id' => $technician->id]);

        $roles = app(TicketActorResolver::class)->resolve($ticket, $other);

        expect($roles)->toEqual([TicketActor::AnyTechnician]);
    });

    test('employee reporter resolves to Reporter only', function () {
        $user = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $user->id]);

        $roles = app(TicketActorResolver::class)->resolve($ticket, $user);

        expect($roles)->toEqual([TicketActor::Reporter]);
    });

    test('employee non-reporter resolves to empty array', function () {
        $user = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create();

        expect(app(TicketActorResolver::class)->resolve($ticket, $user))->toBe([]);
    });

    test('admin reporter does not get Reporter role', function () {
        $user = User::factory()->admin()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $user->id]);

        $roles = app(TicketActorResolver::class)->resolve($ticket, $user);

        expect($roles)->toEqual([TicketActor::Admin]);
    });

    test('manager reporter does not get Reporter role', function () {
        $user = User::factory()->manager()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $user->id]);

        expect(app(TicketActorResolver::class)->resolve($ticket, $user))
            ->toEqual([TicketActor::Manager]);
    });
});

// ── Step 2: Golden path §31 ─────────────────────────────────────────────

describe('golden path', function () {
    test('create → assign → in_progress → resolve → close', function () {
        $service = app(TicketStatusService::class);
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();

        $ticket = $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $technician->id,
        ]), $manager);
        expect($ticket->fresh()->status->name)->toBe('ASSIGNED');
        expect($ticket->fresh()->technician_id)->toBe($technician->id);

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 3,
        ]), $technician);
        expect($ticket->fresh()->status->name)->toBe('IN_PROGRESS');

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 4,
        ]), $technician);
        expect($ticket->fresh()->status->name)->toBe('RESOLVED');
        expect($ticket->fresh()->resolved_at)->not->toBeNull();

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 5,
        ]), $employee);
        expect($ticket->fresh()->status->name)->toBe('CLOSED');
        expect($ticket->fresh()->closed_at)->not->toBeNull();
    });
});

// ── Step 3: Self-assign technician ──────────────────────────────────────

describe('self-assign', function () {
    test('technician self-assigns from OPEN', function () {
        $service = app(TicketStatusService::class);
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);
        $technician = User::factory()->technician()->create();

        $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 3,
        ]), $technician);

        expect($ticket->fresh()->status->name)->toBe('IN_PROGRESS');
        expect($ticket->fresh()->technician_id)->toBe($technician->id);
        expect($ticket->fresh()->histories()->count())->toBe(2);

        // Self-assign notifies reporter with TicketSelfAssigned
        expect(Notification::where('user_id', $employee->id)->where('type', 'TICKET_SELF_ASSIGNED')->exists())->toBeTrue();
        // Actor (technician) is excluded
        expect(Notification::where('user_id', $technician->id)->count())->toBe(0);
    });
});

// ── Step 4: Illegal transitions ─────────────────────────────────────────

describe('illegal transition', function () {
    test('OPEN to RESOLVED throws IllegalStatusTransitionException', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->open()->create();
        $manager = User::factory()->manager()->create();

        $service->transition($ticket, StatusTransitionData::fromArray(['status_id' => 4]), $manager);
    })->throws(IllegalStatusTransitionException::class, 'Status tidak dapat diubah dari OPEN ke RESOLVED');

    test('same status throws IllegalStatusTransitionException', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->open()->create();
        $manager = User::factory()->manager()->create();

        $service->transition($ticket, StatusTransitionData::fromArray(['status_id' => 1]), $manager);
    })->throws(IllegalStatusTransitionException::class);

    test('CLOSED to IN_PROGRESS throws', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->closed()->create();
        $manager = User::factory()->manager()->create();

        $service->transition($ticket, StatusTransitionData::fromArray(['status_id' => 3]), $manager);
    })->throws(IllegalStatusTransitionException::class);

    test('IN_PROGRESS to OPEN throws', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->inProgress()->create();
        $manager = User::factory()->manager()->create();

        $service->transition($ticket, StatusTransitionData::fromArray(['status_id' => 1]), $manager);
    })->throws(IllegalStatusTransitionException::class);

    test('RESOLVED to OPEN throws', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->resolved()->create();
        $manager = User::factory()->manager()->create();

        $service->transition($ticket, StatusTransitionData::fromArray(['status_id' => 1]), $manager);
    })->throws(IllegalStatusTransitionException::class);
});

// ── Step 5: 409 concurrency ─────────────────────────────────────────────

describe('concurrency protection', function () {
    test('stale expected_status_id throws StateConflictException', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->open()->create();
        $manager = User::factory()->manager()->create();

        $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 3, 'expected_status_id' => 3,
        ]), $manager);
    })->throws(StateConflictException::class);

    test('stale expected_status_id with illegal transition still throws 409', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->open()->create();
        $manager = User::factory()->manager()->create();

        $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 2, 'expected_status_id' => 2,
        ]), $manager);
    })->throws(StateConflictException::class);

    test('matching expected_status_id proceeds normally', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->open()->create();
        $technician = User::factory()->technician()->create();

        $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 3, 'expected_status_id' => 1,
        ]), $technician);

        expect($ticket->fresh()->status->name)->toBe('IN_PROGRESS');
    });

    test('null expected_status_id skips concurrency check', function () {
        $service = app(TicketStatusService::class);
        $ticket = Ticket::factory()->open()->create();
        $technician = User::factory()->technician()->create();

        $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 3,
        ]), $technician);

        expect($ticket->fresh()->status->name)->toBe('IN_PROGRESS');
    });
});

// ── Step 6: Side effects ────────────────────────────────────────────────

describe('side effects', function () {
    test('every transition writes history rows', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $ticket = $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $technician->id,
        ]), $manager);
        expect(TicketHistory::count())->toBe(2);

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 3,
        ]), $technician);
        expect(TicketHistory::count())->toBe(3);

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 4,
        ]), $technician);
        expect(TicketHistory::count())->toBe(5);

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 5,
        ]), $employee);
        expect(TicketHistory::count())->toBe(7);
    });

    test('every transition writes audit log', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $ticket = $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $technician->id,
        ]), $manager);
        expect(AuditLog::where('action', AuditAction::Assign->value)->count())->toBe(1);

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 3,
        ]), $technician);
        expect(AuditLog::where('action', AuditAction::StatusChange->value)->count())->toBe(1);

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 4,
        ]), $technician);
        expect(AuditLog::where('action', AuditAction::Resolve->value)->count())->toBe(1);

        $ticket = $service->transition($ticket->fresh(), StatusTransitionData::fromArray([
            'status_id' => 5,
        ]), $employee);
        expect(AuditLog::where('action', AuditAction::Close->value)->count())->toBe(1);
    });

    test('actor does not receive notification for own action', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $ticket = $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $technician->id,
        ]), $manager);

        expect(Notification::where('user_id', $manager->id)->count())->toBe(0);
        expect(Notification::where('user_id', $technician->id)->count())->toBe(1);
    });

    test('note is stored as comment', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $ticket = $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $technician->id,
            'note' => 'Harap ditangani segera.',
        ]), $manager);

        expect(TicketComment::where('ticket_id', $ticket->id)
            ->where('user_id', $manager->id)
            ->where('body', 'Harap ditangani segera.')
            ->exists())->toBeTrue();
    });

    test('reopen clears resolved_at but not sla_breached', function () {
        $service = app(TicketStatusService::class);
        $employee = User::factory()->employee()->create();
        $technician = User::factory()->technician()->create();
        $manager = User::factory()->manager()->create();
        $ticket = Ticket::factory()->resolved()->create([
            'reporter_id' => $employee->id,
            'technician_id' => $technician->id,
            'sla_breached' => true,
            'sla_breached_at' => now(),
        ]);

        $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 3,
        ]), $employee);

        expect($ticket->fresh()->resolved_at)->toBeNull();
        expect($ticket->fresh()->sla_breached)->toBeTrue();

        expect(Notification::where('user_id', $technician->id)
            ->where('type', NotificationType::TicketReopened->value)->count())->toBe(1);
        expect(Notification::where('user_id', $manager->id)
            ->where('type', NotificationType::TicketReopened->value)->count())->toBe(1);
        expect(Notification::where('user_id', $employee->id)->count())->toBe(0);
    });

    test('reopen does not change sla_deadline', function () {
        $service = app(TicketStatusService::class);
        $employee = User::factory()->employee()->create();
        $technician = User::factory()->technician()->create();
        $manager = User::factory()->manager()->create();
        $deadline = now()->addDay();
        $ticket = Ticket::factory()->resolved()->create([
            'reporter_id' => $employee->id,
            'technician_id' => $technician->id,
            'sla_deadline' => $deadline,
        ]);

        $originalDeadline = $ticket->sla_deadline->toIso8601String();

        $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 3,
        ]), $employee);

        expect($ticket->fresh()->sla_deadline->toIso8601String())->toBe($originalDeadline);

        expect(Notification::where('user_id', $technician->id)
            ->where('type', NotificationType::TicketReopened->value)->count())->toBe(1);
        expect(Notification::where('user_id', $manager->id)
            ->where('type', NotificationType::TicketReopened->value)->count())->toBe(1);
        expect(Notification::where('user_id', $employee->id)->count())->toBe(0);
    });

    test('transition ASSIGNED to OPEN unassigns, audits Unassign, notifies old technician', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->assigned()->create([
            'technician_id' => $technician->id,
            'reporter_id' => $employee->id,
        ]);

        $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 1,
        ]), $manager);

        expect($ticket->fresh()->status->name)->toBe('OPEN');
        expect($ticket->fresh()->technician_id)->toBeNull();
        expect(AuditLog::where('action', AuditAction::Unassign->value)->count())->toBe(1);
        expect(Notification::where('user_id', $technician->id)
            ->where('type', NotificationType::TicketUnassigned->value)->count())->toBe(1);
        expect(Notification::where('user_id', $manager->id)->count())->toBe(0);
    });

    test('priority change recalculates sla_deadline from created_at', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $createdAt = now()->subHours(5);
        $ticket = Ticket::factory()->open()->create(['reporter_id' => User::factory()->employee()]);
        $ticket->created_at = $createdAt;
        $ticket->priority_id = 1; // Critical
        $ticket->save();

        $ticket = $service->changePriority($ticket, ChangePriorityData::fromArray([
            'priority_id' => 2,
        ]), $manager);

        expect($ticket->fresh()->priority_id)->toBe(2);
        $expected = (new Carbon($createdAt))->addMinutes(240);
        expect((new Carbon($ticket->fresh()->sla_deadline))->toIso8601String())
            ->toBe($expected->toIso8601String());
    });

    test('cancel from OPEN requires note', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $ticket = Ticket::factory()->open()->create();

        $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 5,
        ]), $manager);
    })->throws(IllegalStatusTransitionException::class);

    test('cancel from OPEN with note proceeds', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $ticket = $service->transition($ticket, StatusTransitionData::fromArray([
            'status_id' => 5,
            'note' => 'Duplicate ticket.',
        ]), $manager);

        expect($ticket->fresh()->status->name)->toBe('CLOSED');
        expect($ticket->fresh()->closed_at)->not->toBeNull();
        expect(AuditLog::where('action', AuditAction::Cancel->value)->count())->toBe(1);
    });

    test('transaction rollback on failure leaves no partial state', function () {
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $mock = Mockery::mock(NotificationService::class);
        $mock->shouldReceive('notifyMany')->andThrow(new Exception('Simulated failure'));
        app()->instance(NotificationService::class, $mock);

        $service = app(TicketStatusService::class);

        try {
            $service->assign($ticket, AssignTicketData::fromArray([
                'technician_id' => $technician->id,
            ]), $manager);
        } catch (Exception $e) {
            // expected
        }

        expect(TicketHistory::count())->toBe(0);
        expect(AuditLog::count())->toBe(0);
        expect(Notification::count())->toBe(0);
        expect($ticket->fresh()->technician_id)->toBeNull();
        expect($ticket->fresh()->status_id)->toBe(1);
    });
});

// ── Assign endpoint ─────────────────────────────────────────────────────

describe('assign endpoint', function () {
    test('assign from OPEN normalizes to ASSIGNED', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->open()->create(['reporter_id' => $employee->id]);

        $ticket = $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $technician->id,
        ]), $manager);

        expect($ticket->fresh()->status->name)->toBe('ASSIGNED');
        expect($ticket->fresh()->technician_id)->toBe($technician->id);
    });

    test('reassign from ASSIGNED notifies both old and new technician', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $oldTech = User::factory()->technician()->create();
        $newTech = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->assigned()->create([
            'technician_id' => $oldTech->id,
            'reporter_id' => $employee->id,
        ]);

        $ticket = $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $newTech->id,
        ]), $manager);

        expect($ticket->fresh()->technician_id)->toBe($newTech->id);
        expect(AuditLog::where('action', AuditAction::Reassign->value)->count())->toBe(1);
        expect(Notification::where('user_id', $oldTech->id)->count())->toBe(1);
        expect(Notification::where('user_id', $newTech->id)->count())->toBe(1);
        expect(Notification::where('user_id', $manager->id)->count())->toBe(0);
    });

    test('assign from CLOSED throws IllegalStatusTransitionException', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $ticket = Ticket::factory()->closed()->create();

        $service->assign($ticket, AssignTicketData::fromArray([
            'technician_id' => $technician->id,
        ]), $manager);
    })->throws(IllegalStatusTransitionException::class);
});

// ── Unassign endpoint ───────────────────────────────────────────────────

describe('unassign endpoint', function () {
    test('unassign from ASSIGNED clears technician and sets OPEN', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $technician = User::factory()->technician()->create();
        $employee = User::factory()->employee()->create();
        $ticket = Ticket::factory()->assigned()->create([
            'technician_id' => $technician->id,
            'reporter_id' => $employee->id,
        ]);

        $ticket = $service->unassign($ticket, $manager);

        expect($ticket->fresh()->status->name)->toBe('OPEN');
        expect($ticket->fresh()->technician_id)->toBeNull();
        expect(AuditLog::where('action', AuditAction::Unassign->value)->count())->toBe(1);
        expect(Notification::where('user_id', $technician->id)->count())->toBe(1);
    });

    test('unassign from OPEN throws', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $ticket = Ticket::factory()->open()->create();

        $service->unassign($ticket, $manager);
    })->throws(IllegalStatusTransitionException::class);
});

// ── changePriority ──────────────────────────────────────────────────────

describe('changePriority', function () {
    test('changePriority on resolved ticket throws', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $ticket = Ticket::factory()->resolved()->create();

        $service->changePriority($ticket, ChangePriorityData::fromArray([
            'priority_id' => 2,
        ]), $manager);
    })->throws(IllegalStatusTransitionException::class);

    test('changePriority on open ticket updates priority and writes history', function () {
        $service = app(TicketStatusService::class);
        $manager = User::factory()->manager()->create();
        $ticket = Ticket::factory()->open()->create();
        $historiesBefore = TicketHistory::count();

        $ticket = $service->changePriority($ticket, ChangePriorityData::fromArray([
            'priority_id' => 2,
        ]), $manager);

        expect($ticket->fresh()->priority_id)->toBe(2);
        expect(TicketHistory::count())->toBe($historiesBefore + 1);
        expect(AuditLog::where('action', AuditAction::PriorityChange->value)->count())->toBe(1);
        expect(Notification::count())->toBe(0);
    });
});
