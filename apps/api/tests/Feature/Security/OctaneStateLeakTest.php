<?php

use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Models\Ticket;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('consecutive requests with different user identities do not leak authentication, profile, ticket isolation, or dashboard data across requests', function () {
    $employeeA = User::factory()->employee()->create([
        'full_name' => 'Employee Alpha',
        'email' => 'employee.alpha@jarvisops.test',
    ]);

    $employeeB = User::factory()->employee()->create([
        'full_name' => 'Employee Beta',
        'email' => 'employee.beta@jarvisops.test',
    ]);

    $manager = User::factory()->manager()->create([
        'full_name' => 'Operational Manager',
        'email' => 'manager.ops@jarvisops.test',
    ]);

    Ticket::factory()->count(2)->create([
        'reporter_id' => $employeeA->id,
        'title' => 'Alpha Ticket',
    ]);

    Ticket::factory()->count(3)->create([
        'reporter_id' => $employeeB->id,
        'title' => 'Beta Ticket',
    ]);

    // Request 1: Employee A -> /api/me
    Sanctum::actingAs($employeeA);
    $resA1 = $this->getJson('/api/me');
    $resA1->assertStatus(200)
        ->assertJsonPath('data.id', $employeeA->id)
        ->assertJsonPath('data.email', 'employee.alpha@jarvisops.test');

    // Request 2: Employee A -> /api/tickets (must see only Alpha's 2 tickets)
    $resA2 = $this->getJson('/api/tickets');
    $resA2->assertStatus(200)
        ->assertJsonCount(2, 'data');
    foreach ($resA2->json('data') as $ticket) {
        expect($ticket['reporter']['id'])->toBe($employeeA->id);
    }

    // Request 3: Employee A forbidden from /api/dashboard/manager
    $this->getJson('/api/dashboard/manager')
        ->assertStatus(403);

    // Request 4: Employee B -> /api/me (ensure identity cleanly switched without state bleed)
    Sanctum::actingAs($employeeB);
    $resB1 = $this->getJson('/api/me');
    $resB1->assertStatus(200)
        ->assertJsonPath('data.id', $employeeB->id)
        ->assertJsonPath('data.email', 'employee.beta@jarvisops.test');

    // Request 5: Employee B -> /api/tickets (must see only Beta's 3 tickets)
    $resB2 = $this->getJson('/api/tickets');
    $resB2->assertStatus(200)
        ->assertJsonCount(3, 'data');
    foreach ($resB2->json('data') as $ticket) {
        expect($ticket['reporter']['id'])->toBe($employeeB->id);
    }

    // Request 6: Employee B forbidden from /api/dashboard/manager
    $this->getJson('/api/dashboard/manager')
        ->assertStatus(403);

    // Request 7: Manager -> /api/me
    Sanctum::actingAs($manager);
    $resM1 = $this->getJson('/api/me');
    $resM1->assertStatus(200)
        ->assertJsonPath('data.id', $manager->id)
        ->assertJsonPath('data.email', 'manager.ops@jarvisops.test');

    // Request 8: Manager -> /api/dashboard/manager (accessible, aggregates operational metrics)
    $resM2 = $this->getJson('/api/dashboard/manager');
    $resM2->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'data' => [
                'total_tickets',
                'open_tickets',
                'resolved_tickets',
                'sla',
                'ticket_trend',
                'by_priority',
                'by_category',
                'technician_performance',
            ],
        ]);

    // Request 9: Unauthenticated / Anonymous request
    // Flush Sanctum / auth credentials
    auth()->forgetGuards();
    $this->app['auth']->forgetGuards();

    $this->getJson('/api/me')
        ->assertStatus(401);

    $this->getJson('/api/tickets')
        ->assertStatus(401);

    $this->getJson('/api/dashboard/manager')
        ->assertStatus(401);

    // Request 10: Anonymous access to public health check remains functional
    $this->getJson('/api/health')
        ->assertStatus(200)
        ->assertJsonPath('data.status', 'ok');

    // Request 11: Switch back to Employee A, verify isolation remains intact after anon
    Sanctum::actingAs($employeeA);
    $resA3 = $this->getJson('/api/me');
    $resA3->assertStatus(200)
        ->assertJsonPath('data.id', $employeeA->id);

    $resA4 = $this->getJson('/api/tickets');
    $resA4->assertStatus(200)
        ->assertJsonCount(2, 'data');
});

test('repeated calls to health check and reference priorities do not accumulate memory or corrupt state', function () {
    $user = User::factory()->employee()->create();
    Sanctum::actingAs($user);

    $initialMemory = memory_get_usage();

    // Loop 20 requests alternately to /api/health and /api/ticket-priorities
    for ($i = 0; $i < 20; $i++) {
        $healthResponse = $this->getJson('/api/health');
        $healthResponse->assertStatus(200)
            ->assertJsonPath('data.status', 'ok');

        $priorityResponse = $this->getJson('/api/ticket-priorities');
        $priorityResponse->assertStatus(200)
            ->assertJsonCount(4, 'data');
    }

    $finalMemory = memory_get_usage();
    // Verify memory growth remains strictly bounded (< 5MB delta across 40 sub-requests in testing environment)
    $memoryDelta = $finalMemory - $initialMemory;
    expect($memoryDelta)->toBeLessThan(5 * 1024 * 1024);
});

test('interleaved two-user empirical authentication and authorization cycle maintains strict isolation and private cache headers', function () {
    // 1. Setup Employee & Manager with realistic relations
    $employee = User::factory()->employee()->create([
        'full_name' => 'Budi Santoso (Employee)',
        'email' => 'employee.test@jarvisops.test',
        'must_change_password' => false,
    ]);

    $manager = User::factory()->manager()->create([
        'full_name' => 'Dewi Sartika (Manager)',
        'email' => 'manager.test@jarvisops.test',
        'must_change_password' => false,
    ]);

    // Create tickets owned by employee
    Ticket::factory()->count(2)->create([
        'reporter_id' => $employee->id,
        'title' => 'Employee Issue Ticket',
    ]);

    // Create ticket owned by manager
    Ticket::factory()->count(1)->create([
        'reporter_id' => $manager->id,
        'title' => 'Manager Management Ticket',
    ]);

    // Create asset assigned to employee
    $asset = Asset::factory()->create(['name' => 'Employee Workstation']);
    AssetAssignment::create([
        'asset_id' => $asset->id,
        'user_id' => $employee->id,
        'assigned_by' => $manager->id,
        'assigned_at' => now(),
    ]);

    // 2. Perform 3 interleaved rounds of authentications and requests
    for ($round = 1; $round <= 3; $round++) {
        // --- PHASE A: EMPLOYEE CONTEXT ---
        $employeeToken = $employee->createToken('employee-device')->plainTextToken;

        // A1: /api/me -> Verify Employee Profile & Role
        $resEmpMe = $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->getJson('/api/me');
        $resEmpMe->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-cache, private')
            ->assertJsonPath('data.email', 'employee.test@jarvisops.test')
            ->assertJsonPath('data.role.name', 'employee');

        // A2: /api/tickets -> Verify scoped to Employee tickets only
        $resEmpTickets = $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->getJson('/api/tickets');
        $resEmpTickets->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-cache, private')
            ->assertJsonCount(2, 'data');
        foreach ($resEmpTickets->json('data') as $t) {
            expect($t['reporter']['id'])->toBe($employee->id);
        }

        // A3: /api/my-assets -> Verify Employee assets
        $resEmpAssets = $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->getJson('/api/my-assets');
        $resEmpAssets->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-cache, private')
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $asset->id);

        // A4: Employee forbidden from /api/dashboard/manager & /api/audit-logs
        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->getJson('/api/dashboard/manager')
            ->assertStatus(403);
        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->getJson('/api/audit-logs')
            ->assertStatus(403);

        // Revoke employee token via logout endpoint
        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->postJson('/api/logout')
            ->assertStatus(200);

        // Reset auth state in request runner
        auth()->forgetGuards();
        $this->app['auth']->forgetGuards();

        // Ensure token is invalidated immediately
        $this->withHeader('Authorization', 'Bearer '.$employeeToken)
            ->getJson('/api/me')
            ->assertStatus(401);

        // --- PHASE B: MANAGER CONTEXT ---
        $managerToken = $manager->createToken('manager-device')->plainTextToken;

        // B1: /api/me -> Verify Manager Profile & Role
        $resMgrMe = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->getJson('/api/me');
        $resMgrMe->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-cache, private')
            ->assertJsonPath('data.email', 'manager.test@jarvisops.test')
            ->assertJsonPath('data.role.name', 'manager');

        // B2: /api/dashboard/manager -> Verify accessible (not 403) and returns KPI structures
        $resMgrDashboard = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->getJson('/api/dashboard/manager');
        $resMgrDashboard->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-cache, private')
            ->assertJsonStructure([
                'success',
                'data' => [
                    'total_tickets',
                    'open_tickets',
                    'resolved_tickets',
                    'sla',
                    'technician_performance',
                ],
            ]);

        // B3: /api/audit-logs -> Verify Manager has audit log access according to permission matrix
        $resMgrAudit = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->getJson('/api/audit-logs');
        $resMgrAudit->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-cache, private');

        // B4: /api/my-assets -> Verify Manager sees 0 assets assigned to them
        $resMgrAssets = $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->getJson('/api/my-assets');
        $resMgrAssets->assertStatus(200)
            ->assertHeader('Cache-Control', 'no-cache, private')
            ->assertJsonCount(0, 'data');

        // Revoke manager token via logout endpoint
        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->postJson('/api/logout')
            ->assertStatus(200);

        // Reset auth state in request runner
        auth()->forgetGuards();
        $this->app['auth']->forgetGuards();

        // Ensure manager token is invalidated
        $this->withHeader('Authorization', 'Bearer '.$managerToken)
            ->getJson('/api/me')
            ->assertStatus(401);
    }
});
