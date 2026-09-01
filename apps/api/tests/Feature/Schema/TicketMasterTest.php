<?php

use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('ticket master data models work correctly with hierarchical categories', function () {
    $parent = TicketCategory::where('name', 'Hardware')->first();
    $child = TicketCategory::where('name', 'Laptop')->first();
    $priority = TicketPriority::where('name', 'Critical')->first();
    $status = TicketStatus::where('name', 'OPEN')->first();

    expect($child->parent->id)->toBe($parent->id)
        ->and($parent->children->pluck('id'))->toContain($child->id)
        ->and($priority->sla_minutes)->toBe(120)
        ->and($status->is_closed)->toBeFalse()
        ->and($status->is_final)->toBeFalse();
});
