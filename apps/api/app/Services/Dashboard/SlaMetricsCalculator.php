<?php

namespace App\Services\Dashboard;

use Illuminate\Database\Eloquent\Builder;

class SlaMetricsCalculator
{
    public function __construct(
        protected DashboardQueryService $queryService,
    ) {}

    public function resolvedMetrics(Builder $ticketQuery, DashboardDateRange $range): array
    {
        $resolved = (clone $ticketQuery)
            ->whereNotNull('resolved_at')
            ->whereBetween('resolved_at', [$range->fromUtc, $range->toUtc]);

        return $this->complianceFor($resolved);
    }

    public function complianceFor(Builder $query): array
    {
        $resolved = (clone $query)->whereNotNull('resolved_at');
        $totalResolved = (clone $resolved)->count();

        if ($totalResolved === 0) {
            return [
                'within_sla' => 0,
                'breached' => 0,
                'compliance_percentage' => null,
                'avg_resolution_minutes' => null,
            ];
        }

        $withinSla = (clone $resolved)
            ->whereColumn('resolved_at', '<=', 'sla_deadline')
            ->count();

        return [
            'within_sla' => $withinSla,
            'breached' => $totalResolved - $withinSla,
            'compliance_percentage' => round(($withinSla / $totalResolved) * 100, 1),
            'avg_resolution_minutes' => $this->queryService->avgResolutionMinutes($resolved),
        ];
    }
}
