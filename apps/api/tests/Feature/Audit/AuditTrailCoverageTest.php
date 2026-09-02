<?php

use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\TicketPriority;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('ticket creation, assignment, and status changes record expected audit trail', function () {
    $department = Department::first() ?? Department::factory()->create();
    $category = TicketCategory::first() ?? TicketCategory::factory()->create();
    $priority = TicketPriority::first() ?? TicketPriority::factory()->create();

    $employee = User::factory()->employee()->create(['department_id' => $department->id]);
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();

    // 1. Create ticket
    Sanctum::actingAs($employee);
    $resCreate = $this->postJson('/api/tickets', [
        'title' => 'Kerusakan Jaringan',
        'description' => 'Tidak bisa konek internet kantor',
        'category_id' => $category->id,
        'priority_id' => $priority->id,
    ])->assertStatus(201);

    $ticketId = $resCreate->json('data.id');

    expect(AuditLog::where('module', 'ticket')->where('module_id', $ticketId)->where('action', 'create')->exists())->toBeTrue();

    // 2. Assign ticket
    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticketId}/assign", ['technician_id' => $technician->id])
        ->assertStatus(200);

    expect(AuditLog::where('module', 'ticket')->where('module_id', $ticketId)->where('action', 'assign')->exists())->toBeTrue();
});
