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

        $breached = $totalResolved - $withinSla;
        $compliance = round(($withinSla / $totalResolved) * 100, 1);
        $avg = $this->queryService->avgResolutionMinutes($resolved);

        return [
            'within_sla' => $withinSla,
            'breached' => $breached,
            'compliance_percentage' => $compliance,
            'avg_resolution_minutes' => $avg,
        ];
    }
}
