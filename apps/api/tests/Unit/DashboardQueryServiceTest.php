<?php

use App\Models\Ticket;
use App\Services\Dashboard\DashboardQueryService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('dateBucket returns correct SQL for sqlite', function () {
    $service = new DashboardQueryService;
    $sql = $service->dateBucket('created_at');
    expect($sql)->toContain("strftime('%Y-%m-%d', created_at, '+7 hours')");
});

test('minutesDiff returns correct SQL for sqlite', function () {
    $service = new DashboardQueryService;
    $sql = $service->minutesDiff('created_at', 'resolved_at');
    expect($sql)->toContain('strftime');
});

test('avgResolutionMinutes returns null when no resolved tickets', function () {
    $service = new DashboardQueryService;
    $query = Ticket::whereRaw('1 = 0');
    expect($service->avgResolutionMinutes($query))->toBeNull();
});
