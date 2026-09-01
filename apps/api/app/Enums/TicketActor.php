<?php

namespace App\Enums;

enum TicketActor: string
{
    case Reporter = 'reporter';
    case Technician = 'technician';
    case Manager = 'manager';
    case Admin = 'admin';
    case AnyTechnician = 'any_technician';
}
