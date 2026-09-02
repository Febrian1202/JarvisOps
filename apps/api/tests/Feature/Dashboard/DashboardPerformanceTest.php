<?php

use App\Enums\RoleName;
use App\Enums\TicketStatusName;
use App\Models\Asset;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Role;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\TicketStatus;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->seed(ReferenceDataSeeder::class);

    $dept = Department::first();
    $adminRole = Role::where('name', RoleName::Admin->value)->first();
    $employeeRole = Role::where('name', RoleName::Employee->value)->first();
    $technicianRole = Role::where('name', RoleName::Technician->value)->first();

    $technicians = User::factory()->count(3)->create([
        'role_id' => $technicianRole->id,
        'department_id' => $dept->id,
    ]);
    $employee = User::factory()->create([
        'role_id' => $employeeRole->id,
        'department_id' => $dept->id,
    ]);
    $admin = User::factory()->create([
        'role_id' => $adminRole->id,
        'department_id' => $dept->id,
    ]);

    $cat = TicketCategory::first();
    $prio = TicketPriority::first();
    $openStatus = TicketStatus::where('name', TicketStatusName::Open->value)->first();
    $resolvedStatus = TicketStatus::where('name', TicketStatusName::Resolved->value)->first();

    Ticket::factory()->count(20)->create([
        'reporter_id' => $employee->id,
        'department_id' => $dept->id,
        'category_id' => $cat->id,
        'priority_id' => $prio->id,
        'status_id' => $openStatus->id,
    ]);
    Ticket::factory()->count(10)->resolved()->create([
        'reporter_id' => $employee->id,
        'technician_id' => $technicians[0]->id,
        'department_id' => $dept->id,
        'category_id' => $cat->id,
        'priority_id' => $prio->id,
        'status_id' => $resolvedStatus->id,
    ]);
    Ticket::factory()->count(10)->resolved()->create([
        'reporter_id' => $employee->id,
        'technician_id' => $technicians[1]->id,
        'department_id' => $dept->id,
        'category_id' => $cat->id,
        'priority_id' => $prio->id,
        'status_id' => $resolvedStatus->id,
    ]);

    Asset::factory()->count(10)->create();
    AuditLog::factory()->count(15)->create(['user_id' => $admin->id]);
});

test('all four dashboard endpoints have constant query count under data growth', function () {
    $dept = Department::first();
    $adminRole = Role::where('name', RoleName::Admin->value)->first();
    $employeeRole = Role::where('name', RoleName::Employee->value)->first();

    $employee = User::where('role_id', $employeeRole->id)->first();
    $cat = TicketCategory::first();
    $prio = TicketPriority::first();
    $openStatus = TicketStatus::where('name', TicketStatusName::Open->value)->first();

    $admin = User::where('role_id', $adminRole->id)->first();
    $admin->load('role');

    $endpoints = [
        '/api/dashboard/employee',
        '/api/dashboard/technician',
        '/api/dashboard/manager',
        '/api/dashboard/admin',
    ];

    Sanctum::actingAs($admin);

    foreach ($endpoints as $endpoint) {
        // Baseline query count
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson($endpoint)->assertStatus(200);
        $base = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Add volume growth (20 tickets, 10 assets, 10 audit logs)
        Ticket::factory()->count(20)->create([
            'reporter_id' => $employee->id,
            'department_id' => $dept->id,
            'category_id' => $cat->id,
            'priority_id' => $prio->id,
            'status_id' => $openStatus->id,
        ]);
        Asset::factory()->count(10)->create();
        AuditLog::factory()->count(10)->create(['user_id' => $admin->id]);

        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson($endpoint)->assertStatus(200);
        $growth = count(DB::getQueryLog());
        DB::disableQueryLog();

        // Assert query count is constant
        expect($growth)->toBe($base);
    }
});

test('admin dashboard response time under 500ms', function () {
    $adminRole = Role::where('name', RoleName::Admin->value)->first();
    $admin = User::where('role_id', $adminRole->id)->first();
    Sanctum::actingAs($admin);

    $start = microtime(true);
    $this->getJson('/api/dashboard/admin')->assertStatus(200);
    $duration = (microtime(true) - $start) * 1000;

    expect($duration)->toBeLessThan(500);
});
