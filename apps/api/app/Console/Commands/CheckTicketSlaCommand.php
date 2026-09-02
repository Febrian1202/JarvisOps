<?php

namespace App\Console\Commands;

use App\Services\Sla\SlaBreachDetector;
use Illuminate\Console\Command;

class CheckTicketSlaCommand extends Command
{
    protected $signature = 'tickets:check-sla {--chunk=250 : Number of tickets per chunk}';

    protected $description = 'Scan active tickets past SLA deadline, mark them as breached, and trigger notifications.';

    public function handle(SlaBreachDetector $detector): int
    {
        $this->info('Starting SLA breach scan...');

        $chunk = (int) $this->option('chunk');
        $result = $detector->scan($chunk);

        $this->info(sprintf(
            'SLA check completed: %d checked, %d marked breached, %d notifications created.',
            $result->checkedCount,
            $result->breachedCount,
            $result->notifiedCount
        ));

        return self::SUCCESS;
    }
}
