<?php

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Enums\NotificationType;

test('AuditAction has all 16 cases', function () {
    $cases = array_map(fn ($c) => $c->value, AuditAction::cases());
    expect($cases)->toContain('create', 'update', 'delete', 'assign', 'reassign',
        'unassign', 'self_assign', 'status_change', 'priority_change',
        'reopen', 'resolve', 'close', 'cancel', 'login', 'logout', 'password_reset');
});

test('AuditModule has all 9 cases', function () {
    $cases = array_map(fn ($c) => $c->value, AuditModule::cases());
    expect($cases)->toContain('ticket', 'asset', 'article', 'user', 'role',
        'department', 'ticket_category', 'ticket_priority', 'auth');
});

test('NotificationType has all 10 cases', function () {
    $cases = array_map(fn ($c) => $c->value, NotificationType::cases());
    expect($cases)->toContain(
        'TICKET_ASSIGNED', 'TICKET_REASSIGNED', 'TICKET_UNASSIGNED',
        'TICKET_STATUS_CHANGED', 'TICKET_SELF_ASSIGNED', 'TICKET_REOPENED',
        'TICKET_RESOLVED', 'TICKET_CLOSED', 'TICKET_CANCELLED', 'TICKET_COMMENTED',
    );
});
