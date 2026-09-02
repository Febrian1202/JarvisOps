<?php

namespace App\Services\Dashboard;

use App\Models\Ticket;
use App\Models\User;

class ManagerDashboardService
{
    public function __construct(
        protected DashboardCountsQuery $countsQuery,
        protected SlaMetricsCalculator $slaMetrics,
        protected TicketTrendQuery $trendQuery,
        protected TechnicianPerformanceQuery $performanceQuery,
    ) {}

    public function get(User $actor, DashboardDateRange $range): array
    {
        $tickets = Ticket::query();

        $sla = $this->slaMetrics->resolvedMetrics(clone $tickets, $range);
        unset($sla['total_resolved']);

        return [
            'total_tickets' => $this->countsQuery->countTickets(clone $tickets, $range),
            'open_tickets' => $this->countsQuery->countOpenTickets(clone $tickets),
            'resolved_tickets' => $range->applyToResolved(clone $tickets)->count(),
            'closed_tickets' => $this->countsQuery->countClosed(clone $tickets),
            'sla' => $sla,
            'ticket_trend' => $this->trendQuery->daily(clone $tickets, $range),
            'by_priority' => $this->countsQuery->countByPriority(clone $tickets, $range),
            'by_category' => $this->countsQuery->countByCategory(clone $tickets, $range),
            'technician_performance' => $this->performanceQuery->forRole(clone $tickets, $range),
        ];
    }
}
