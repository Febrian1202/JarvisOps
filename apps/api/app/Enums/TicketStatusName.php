<?php

namespace App\Enums;

enum TicketStatusName: string
{
    case Open = 'OPEN';
    case Assigned = 'ASSIGNED';
    case InProgress = 'IN_PROGRESS';
    case Resolved = 'RESOLVED';
    case Closed = 'CLOSED';
}
