<?php

use App\Models\Department;
use App\Models\KnowledgeCategory;
use App\Models\Role;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

test('ReferenceDataSeeder seeds pinned roles, priorities, statuses and is idempotent', function () {
    $this->seed(ReferenceDataSeeder::class);
    $this->seed(ReferenceDataSeeder::class); // Run twice to verify idempotency

    expect(Role::count())->toBe(4)
        ->and(Role::find(1)->name)->toBe('administrator')
        ->and(Role::find(2)->name)->toBe('manager')
        ->and(Role::find(3)->name)->toBe('technician')
        ->and(Role::find(4)->name)->toBe('employee')
        ->and(TicketStatus::count())->toBe(5)
        ->and(TicketStatus::find(1)->name)->toBe('OPEN')
        ->and(TicketStatus::find(4)->is_closed)->toBeTrue()
        ->and(TicketStatus::find(5)->is_final)->toBeTrue()
        ->and(TicketPriority::count())->toBe(4)
        ->and(TicketPriority::find(1)->sla_minutes)->toBe(120)
        ->and(TicketPriority::find(4)->sla_minutes)->toBe(1440)
        ->and(Department::count())->toBe(5)
        ->and(KnowledgeCategory::count())->toBe(5)
        ->and(TicketCategory::whereNull('parent_id')->count())->toBe(5)
        ->and(TicketCategory::whereNotNull('parent_id')->count())->toBe(17);
});

test('DemoUserSeeder creates 4 demo users with employee profiles', function () {
    $this->seed(DatabaseSeeder::class);

    $admin = User::where('email', 'admin@jarvisops.test')->first();
    $manager = User::where('email', 'manager@jarvisops.test')->first();
    $tech = User::where('email', 'technician@jarvisops.test')->first();
    $employee = User::where('email', 'employee@jarvisops.test')->first();

    expect($admin)->not->toBeNull()
        ->and($admin->role->name)->toBe('administrator')
        ->and($admin->employeeProfile)->not->toBeNull()
        ->and($manager)->not->toBeNull()
        ->and($manager->role->name)->toBe('manager')
        ->and($tech)->not->toBeNull()
        ->and($tech->role->name)->toBe('technician')
        ->and($employee)->not->toBeNull()
        ->and($employee->role->name)->toBe('employee');
});
