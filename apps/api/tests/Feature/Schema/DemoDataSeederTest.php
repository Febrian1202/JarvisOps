<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\AssetHistory;
use App\Models\KnowledgeArticle;
use App\Models\Ticket;
use App\Models\User;
use Database\Seeders\DemoDataSeeder;
use Database\Seeders\DemoUserSeeder;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function seedDemoData(): void
{
    test()->seed(ReferenceDataSeeder::class);
    test()->seed(DemoUserSeeder::class);
    test()->seed(DemoDataSeeder::class);
}

test('demo seeder produces tickets across all five statuses', function () {
    seedDemoData();

    foreach ([1, 2, 3, 4, 5] as $statusId) {
        expect(Ticket::where('status_id', $statusId)->exists())->toBeTrue(
            "Status ID {$statusId} should be represented in demo data"
        );
    }

    expect(Ticket::count())->toBeGreaterThanOrEqual(30)
        ->and(Ticket::count())->toBeLessThanOrEqual(50);
});

test('demo seeder yields near-87 percent SLA compliance on resolved tickets', function () {
    seedDemoData();

    $resolved = Ticket::whereNotNull('resolved_at');
    $totalResolved = (clone $resolved)->count();
    $withinSla = (clone $resolved)->whereColumn('resolved_at', '<=', 'sla_deadline')->count();

    expect($totalResolved)->toBeGreaterThan(0);

    $compliance = ($withinSla / $totalResolved) * 100;

    expect($compliance)->toBeGreaterThanOrEqual(80.0)
        ->and($compliance)->toBeLessThanOrEqual(95.0);
});

test('demo seeder produces active breached tickets for dashboard highlights', function () {
    seedDemoData();

    $activeBreached = Ticket::whereIn('status_id', [1, 2, 3])
        ->where(function ($query) {
            $query->where('sla_breached', true)
                ->orWhere(function ($sub) {
                    $sub->whereNotNull('sla_deadline')
                        ->where('sla_deadline', '<', now());
                });
        })
        ->count();

    expect($activeBreached)->toBeGreaterThanOrEqual(3);
});

test('demo seeder provides at least three technicians with distinct performance', function () {
    seedDemoData();

    $technicianIds = Ticket::whereNotNull('resolved_at')
        ->whereNotNull('technician_id')
        ->distinct()
        ->pluck('technician_id');

    $technicians = User::whereIn('id', $technicianIds)
        ->whereHas('role', fn ($query) => $query->where('name', 'technician'))
        ->get();

    expect($technicians->count())->toBeGreaterThanOrEqual(3);

    $complianceRates = $technicians
        ->map(function (User $technician) {
            $resolved = Ticket::where('technician_id', $technician->id)->whereNotNull('resolved_at');
            $total = (clone $resolved)->count();
            $withinSla = (clone $resolved)->whereColumn('resolved_at', '<=', 'sla_deadline')->count();

            return $total > 0 ? $withinSla / $total : null;
        })
        ->filter()
        ->unique()
        ->values();

    expect($complianceRates->count())->toBeGreaterThanOrEqual(2);
});

test('demo seeder records multi holder asset history with active assignment', function () {
    seedDemoData();

    $asset = Asset::where('asset_tag', 'AST-00002')->first();

    expect($asset)->not->toBeNull()
        ->and(AssetHistory::where('asset_id', $asset->id)->count())->toBeGreaterThanOrEqual(3)
        ->and(AssetAssignment::where('asset_id', $asset->id)->count())->toBeGreaterThanOrEqual(2);

    $employee = User::where('email', 'employee@jarvisops.test')->first();

    $activeAssignment = AssetAssignment::where('asset_id', $asset->id)
        ->whereNull('released_at')
        ->first();

    expect($activeAssignment)->not->toBeNull()
        ->and($activeAssignment->user_id)->toBe($employee->id);
});

test('demo seeder represents every core asset status', function () {
    seedDemoData();

    foreach (['available', 'assigned', 'maintenance', 'retired'] as $status) {
        expect(Asset::where('status', $status)->exists())->toBeTrue(
            "Asset status '{$status}' should be represented in demo data"
        );
    }
});

test('demo seeder is deterministic across reseeds', function () {
    seedDemoData();

    $firstPass = [
        'tickets' => Ticket::count(),
        'views' => KnowledgeArticle::orderBy('slug')->pluck('view_count')->implode(','),
        'compliance' => Ticket::whereNotNull('resolved_at')
            ->whereColumn('resolved_at', '<=', 'sla_deadline')
            ->count(),
    ];

    test()->seed(ReferenceDataSeeder::class);
    test()->seed(DemoUserSeeder::class);
    test()->seed(DemoDataSeeder::class);

    $secondPass = [
        'tickets' => Ticket::count(),
        'views' => KnowledgeArticle::orderBy('slug')->pluck('view_count')->implode(','),
        'compliance' => Ticket::whereNotNull('resolved_at')
            ->whereColumn('resolved_at', '<=', 'sla_deadline')
            ->count(),
    ];

    expect($secondPass)->toBe($firstPass);
});
