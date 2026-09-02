<?php

namespace App\Services\Ticket;

use App\DTOs\Ticket\AssignTicketData;
use App\DTOs\Ticket\ChangePriorityData;
use App\DTOs\Ticket\StatusTransitionData;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notification\NotificationService;
use App\Services\Sla\SlaService;

final class TicketStatusService
{
    public function __construct(
        private readonly SlaService $slaService,
        private readonly AuditLogger $auditLogger,
        private readonly NotificationService $notificationService,
    ) {}

    public function transition(Ticket $ticket, StatusTransitionData $data, User $actor): Ticket
    {
        throw new \LogicException('Not implemented yet.');
    }

    public function assign(Ticket $ticket, AssignTicketData $data, User $actor): Ticket
    {
        throw new \LogicException('Not implemented yet.');
    }

    public function unassign(Ticket $ticket, User $actor): Ticket
    {
        throw new \LogicException('Not implemented yet.');
    }

    public function changePriority(Ticket $ticket, ChangePriorityData $data, User $actor): Ticket
    {
        throw new \LogicException('Not implemented yet.');
    }
}
