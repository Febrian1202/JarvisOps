<?php

namespace App\Enums;

enum NotificationType: string
{
    case TicketAssigned = 'TICKET_ASSIGNED';
    case TicketReassigned = 'TICKET_REASSIGNED';
    case TicketUnassigned = 'TICKET_UNASSIGNED';
    case TicketStatusChanged = 'TICKET_STATUS_CHANGED';
    case TicketSelfAssigned = 'TICKET_SELF_ASSIGNED';
    case TicketReopened = 'TICKET_REOPENED';
    case TicketResolved = 'TICKET_RESOLVED';
    case TicketClosed = 'TICKET_CLOSED';
    case TicketCancelled = 'TICKET_CANCELLED';
    case TicketCommented = 'TICKET_COMMENTED';
    case TicketSlaBreached = 'TICKET_SLA_BREACHED';
}
