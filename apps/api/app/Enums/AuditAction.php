<?php

namespace App\Enums;

enum AuditAction: string
{
    case Create = 'create';
    case Update = 'update';
    case Delete = 'delete';
    case Assign = 'assign';
    case Reassign = 'reassign';
    case Unassign = 'unassign';
    case SelfAssign = 'self_assign';
    case StatusChange = 'status_change';
    case PriorityChange = 'priority_change';
    case Reopen = 'reopen';
    case Resolve = 'resolve';
    case Close = 'close';
    case Cancel = 'cancel';
    case Login = 'login';
    case Logout = 'logout';
    case PasswordReset = 'password_reset';
    case SlaBreach = 'sla_breach';
    case Release = 'release';
    case Publish = 'publish';
    case Unpublish = 'unpublish';
    case Activate = 'activate';
    case Deactivate = 'deactivate';
}
