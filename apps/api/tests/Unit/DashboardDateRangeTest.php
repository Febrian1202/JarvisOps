<?php

use App\Models\Ticket;
use App\Services\Dashboard\DashboardDateRange;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('default range covers last 30 days in WIB', function () {
    $range = DashboardDateRange::default();
    $todayWib = now('Asia/Jakarta')->startOfDay();
    $fromWib = $range->fromUtc->setTimezone('Asia/Jakarta')->startOfDay();
    $diffDays = $fromWib->diffInDays($todayWib);
    expect((int) $diffDays)->toBe(29);
});

test('fromDates parses Y-m-d as WIB and converts to UTC', function () {
    $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-31');
    expect($range->fromUtc->format('Y-m-d H:i'))->toBe('2026-07-31 17:00')
        ->and($range->toUtc->format('Y-m-d H:i'))->toBe('2026-08-31 16:59');
});

test('fromDates with null defaults returns 30 days', function () {
    $range = DashboardDateRange::fromDates(null, null);
    expect($range->fromUtc)->toBeInstanceOf(CarbonImmutable::class)
        ->and($range->toUtc)->toBeInstanceOf(CarbonImmutable::class);
});

test('applyToCreated adds whereBetween clause', function () {
    $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-31');
    $query = Ticket::query();
    $query = $range->applyToCreated($query);
    $wheres = $query->getQuery()->wheres;
    expect($wheres)->toHaveCount(1)
        ->and(strtolower($wheres[0]['type']))->toBe('between');
});

test('applyToResolved adds whereNotNull and whereBetween', function () {
    $range = DashboardDateRange::fromDates('2026-08-01', '2026-08-31');
    $query = Ticket::query();
    $query = $range->applyToResolved($query);
    $wheres = $query->getQuery()->wheres;
    expect($wheres)->toHaveCount(2)
        ->and(strtolower($wheres[0]['type']))->toBe('notnull')
        ->and(strtolower($wheres[1]['type']))->toBe('between');
});
