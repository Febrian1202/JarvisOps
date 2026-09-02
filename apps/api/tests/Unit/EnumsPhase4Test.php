<?php

use App\Enums\AuditAction;
use App\Enums\NotificationType;

test('NotificationType contains TicketSlaBreached', function () {
    expect(NotificationType::TicketSlaBreached->value)->toBe('TICKET_SLA_BREACHED');
});

test('AuditAction contains SlaBreach', function () {
    expect(AuditAction::SlaBreach->value)->toBe('sla_breach');
});
