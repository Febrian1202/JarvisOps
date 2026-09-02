<?php

use App\Enums\NotificationType;
use App\Models\TicketCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket', 'golden-path');

test('golden path completes end to end over HTTP according to PRD section 38', function () {
    // 1. Actors
    $employee = User::factory()->employee()->create();
    $manager = User::factory()->manager()->create();
    $technician = User::factory()->technician()->create();

    // 2. Step 1: Employee creates ticket (201 Created -> OPEN)
    Sanctum::actingAs($employee);
    $createResponse = $this->postJson('/api/tickets', [
        'title' => 'Monitor blank setelah update driver',
        'description' => 'Layar hitam pekat tidak ada sinyal sama sekali.',
        'category_id' => TicketCategory::where('name', 'Monitor')->first()->id,
        'priority_id' => 2, // High (SLA 240 mins)
    ])->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.status.name', 'OPEN')
        ->assertJsonPath('data.priority.name', 'High')
        ->assertJsonPath('data.reporter.id', $employee->id);

    $ticketId = $createResponse->json('data.id');

    // 3. Step 2: Manager assigns technician (200 OK -> ASSIGNED)
    Sanctum::actingAs($manager);
    $this->postJson("/api/tickets/{$ticketId}/assign", [
        'technician_id' => $technician->id,
        'note' => 'Tolong prioritaskan penanganan ini.',
    ])->assertStatus(200)
        ->assertJsonPath('data.status.name', 'ASSIGNED')
        ->assertJsonPath('data.technician.id', $technician->id);

    // Verify technician received notification
    $this->assertDatabaseHas('notifications', [
        'user_id' => $technician->id,
        'type' => NotificationType::TicketAssigned->value,
    ]);

    // 4. Step 3: Technician starts working (200 OK -> IN_PROGRESS)
    Sanctum::actingAs($technician);
    $this->postJson("/api/tickets/{$ticketId}/status", [
        'status_id' => 3, // IN_PROGRESS
    ])->assertStatus(200)
        ->assertJsonPath('data.status.name', 'IN_PROGRESS');

    // 5. Step 4: Technician adds a comment (201 Created)
    $this->postJson("/api/tickets/{$ticketId}/comments", [
        'body' => 'Sedang dicek kabel HDMI dan roll back driver GPU.',
    ])->assertStatus(201)
        ->assertJsonPath('data.body', 'Sedang dicek kabel HDMI dan roll back driver GPU.');

    // Verify employee received comment notification
    $this->assertDatabaseHas('notifications', [
        'user_id' => $employee->id,
        'type' => NotificationType::TicketCommented->value,
    ]);

    // 6. Step 5: Technician resolves ticket (200 OK -> RESOLVED)
    $this->postJson("/api/tickets/{$ticketId}/status", [
        'status_id' => 4, // RESOLVED
        'note' => 'Driver GPU berhasil di-rollback ke versi stabil.',
    ])->assertStatus(200)
        ->assertJsonPath('data.status.name', 'RESOLVED')
        ->assertJsonPath('data.resolved_at', fn ($val) => $val !== null);

    // 7. Step 6: Employee confirms and closes ticket (200 OK -> CLOSED)
    Sanctum::actingAs($employee);
    $this->postJson("/api/tickets/{$ticketId}/status", [
        'status_id' => 5, // CLOSED
        'note' => 'Sudah normal kembali, terima kasih.',
    ])->assertStatus(200)
        ->assertJsonPath('data.status.name', 'CLOSED')
        ->assertJsonPath('data.closed_at', fn ($val) => $val !== null);

    // 8. Step 7: Verify final detail endpoint
    $this->getJson("/api/tickets/{$ticketId}")
        ->assertStatus(200)
        ->assertJsonPath('data.status.name', 'CLOSED')
        ->assertJsonPath('data.comments_count', 4) // 1 assign note + 1 standalone comment + 1 resolve note + 1 close note
        ->assertJsonPath('data.available_actions', []); // No actions available on CLOSED ticket

    // 9. Step 8: Verify timeline history contains complete progression
    $historyResponse = $this->getJson("/api/tickets/{$ticketId}/histories")
        ->assertStatus(200);

    $histories = $historyResponse->json('data');
    expect(count($histories))->toBeGreaterThanOrEqual(5);

    // Verify history values are readable labels
    $statusHistories = array_filter($histories, fn ($h) => $h['field_changed'] === 'status_id');
    $statusTransitions = array_map(fn ($h) => [$h['old_value'], $h['new_value']], array_values($statusHistories));

    expect($statusTransitions)->toContain([null, 'OPEN']);
    expect($statusTransitions)->toContain(['OPEN', 'ASSIGNED']);
    expect($statusTransitions)->toContain(['ASSIGNED', 'IN_PROGRESS']);
    expect($statusTransitions)->toContain(['IN_PROGRESS', 'RESOLVED']);
    expect($statusTransitions)->toContain(['RESOLVED', 'CLOSED']);
});
