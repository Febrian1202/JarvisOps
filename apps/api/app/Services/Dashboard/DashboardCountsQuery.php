<?php

namespace App\Services\Dashboard;

use Illuminate\Database\Eloquent\Builder;

class DashboardCountsQuery
{
    public function countTickets(Builder $query, DashboardDateRange $range): int
    {
        return (clone $query)->whereBetween('created_at', [$range->fromUtc, $range->toUtc])->count();
    }

    public function countClosed(Builder $query): int
    {
        return (clone $query)
            ->whereHas('status', fn ($q) => $q->where('is_final', true))
            ->count();
    }

    public function countOpenByStatus(Builder $query, int $statusId): int
    {
        return (clone $query)->where('status_id', $statusId)->count();
    }

    public function countOpenTickets(Builder $query): int
    {
        return (clone $query)->whereHas('status', fn ($q) => $q->where('is_closed', false))->count();
    }

    public function countByPriority(Builder $query, DashboardDateRange $range): array
    {
        return (clone $query)
            ->whereBetween('tickets.created_at', [$range->fromUtc, $range->toUtc])
            ->join('ticket_priorities', 'tickets.priority_id', '=', 'ticket_priorities.id')
            ->selectRaw('ticket_priorities.name as priority, COUNT(*) as count')
            ->groupBy('ticket_priorities.name', 'ticket_priorities.id')
            ->orderBy('ticket_priorities.id')
            ->get()
            ->map(fn ($row) => ['priority' => $row->priority, 'count' => (int) $row->count])
            ->toArray();
    }

    public function countByCategory(Builder $query, DashboardDateRange $range): array
    {
        return (clone $query)
            ->whereBetween('tickets.created_at', [$range->fromUtc, $range->toUtc])
            ->join('ticket_categories', 'tickets.category_id', '=', 'ticket_categories.id')
            ->selectRaw('ticket_categories.name as category, COUNT(*) as count')
            ->groupBy('ticket_categories.name', 'ticket_categories.id')
            ->orderBy('ticket_categories.id')
            ->get()
            ->map(fn ($row) => ['category' => $row->category, 'count' => (int) $row->count])
            ->toArray();
    }
}
