<?php

namespace App\Enums;

enum RoleName: string
{
    case Admin = 'administrator';
    case Manager = 'manager';
    case Technician = 'technician';
    case Employee = 'employee';
}
