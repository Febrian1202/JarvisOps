<?php

use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('ticket master data models work correctly with hierarchical categories', function () {
    $parent = TicketCategory::create([
        'name' => 'Hardware',
        'description' => 'Hardware issues',
    ]);

    $child = TicketCategory::create([
        'name' => 'Laptop',
        'description' => 'Laptop issues',
        'parent_id' => $parent->id,
    ]);

    $priority = TicketPriority::create([
        'name' => 'Critical',
        'sla_minutes' => 120,
        'description' => 'Critical priority',
    ]);

    $status = TicketStatus::create([
        'name' => 'OPEN',
        'description' => 'Open ticket',
        'is_closed' => false,
        'is_final' => false,
    ]);

    expect($child->parent->id)->toBe($parent->id)
        ->and($parent->children)->toHaveCount(1)
        ->and($parent->children->first()->id)->toBe($child->id)
        ->and($priority->sla_minutes)->toBe(120)
        ->and($status->is_closed)->toBeFalse()
        ->and($status->is_final)->toBeFalse();
});
