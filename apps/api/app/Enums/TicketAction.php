<?php

namespace App\Enums;

enum TicketAction: string
{
    case Assign = 'assign';
    case Unassign = 'unassign';
    case Start = 'start';
    case Resolve = 'resolve';
    case Close = 'close';
    case Cancel = 'cancel';
    case Reopen = 'reopen';
    case ChangePriority = 'change_priority';
    case Comment = 'comment';
    case Attach = 'attach';
    case Edit = 'edit';
}
