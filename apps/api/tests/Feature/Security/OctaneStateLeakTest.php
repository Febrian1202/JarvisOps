<?php

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
