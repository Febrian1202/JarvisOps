<?php

namespace App\Exceptions;

use Exception;

class PendingDashboardException extends Exception
{
    protected $message = 'Dashboard endpoint not yet implemented.';
}
