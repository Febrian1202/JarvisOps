<?php

namespace App\Services\Dashboard;

use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;

final class DashboardDateRange
{
    public function __construct(
        public readonly CarbonImmutable $fromUtc,
        public readonly CarbonImmutable $toUtc,
    ) {}

    public static function default(): self
    {
        $todayWib = CarbonImmutable::now('Asia/Jakarta')->startOfDay();

        return new self(
            $todayWib->subDays(29)->setTimezone('UTC'),
            $todayWib->endOfDay()->setTimezone('UTC'),
        );
    }

    public static function fromDates(?string $dateFrom, ?string $dateTo): self
    {
        if ($dateFrom === null && $dateTo === null) {
            return self::default();
        }

        $tz = 'Asia/Jakarta';
        $fromWib = $dateFrom !== null
            ? CarbonImmutable::createFromFormat('Y-m-d', $dateFrom, $tz)->startOfDay()
            : self::default()->fromUtc->setTimezone($tz);

        $toWib = $dateTo !== null
            ? CarbonImmutable::createFromFormat('Y-m-d', $dateTo, $tz)->endOfDay()
            : $fromWib->endOfDay();

        return new self($fromWib->setTimezone('UTC'), $toWib->setTimezone('UTC'));
    }

    public function applyToCreated(Builder $query): Builder
    {
        return $query->whereBetween('created_at', [$this->fromUtc, $this->toUtc]);
    }

    public function applyToResolved(Builder $query): Builder
    {
        return $query->whereNotNull('resolved_at')
            ->whereBetween('resolved_at', [$this->fromUtc, $this->toUtc]);
    }
}
