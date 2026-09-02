<?php

namespace App\Services\Dashboard;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class DashboardQueryService
{
    public function dateBucket(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column}, '+7 hours')",
            default => "DATE(CONVERT_TZ({$column}, '+00:00', '+07:00'))",
        };
    }

    public function minutesDiff(string $from, string $to): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST((strftime('%s', {$to}) - strftime('%s', {$from})) / 60 AS INTEGER)",
            default => "TIMESTAMPDIFF(MINUTE, {$from}, {$to})",
        };
    }

    public function avgResolutionMinutes(Builder $query): ?int
    {
        $diff = $this->minutesDiff('created_at', 'resolved_at');
        $row = (clone $query)
            ->selectRaw("ROUND(AVG({$diff})) as avg_minutes")
            ->first();

        return $row?->avg_minutes !== null ? (int) $row->avg_minutes : null;
    }
}
