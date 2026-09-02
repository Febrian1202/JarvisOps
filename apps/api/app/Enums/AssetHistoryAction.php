<?php

namespace App\Enums;

enum AssetHistoryAction: string
{
    case Created = 'created';
    case Assigned = 'assigned';
    case Released = 'released';
    case StatusChanged = 'status_changed';
}
