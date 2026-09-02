<?php

namespace App\Enums;

enum AuditModule: string
{
    case Ticket = 'ticket';
    case Asset = 'asset';
    case Article = 'article';
    case User = 'user';
    case Role = 'role';
    case Department = 'department';
    case TicketCategory = 'ticket_category';
    case TicketPriority = 'ticket_priority';
    case Auth = 'auth';
    case KnowledgeCategory = 'knowledge_category';
}
