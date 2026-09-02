<?php

use Illuminate\Support\Facades\Schedule;

Schedule::command('sanctum:prune-expired --hours=24')->daily();
Schedule::command('tickets:check-sla')->everyFiveMinutes()->withoutOverlapping();
