<?php

use App\Models\Department;
use App\Models\Ticket;
use App\Models\TicketCategory;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('authenticated user can view master data lists', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/departments')->assertStatus(200)->assertJsonStructure(['data' => [['id', 'name']]]);
    $this->getJson('/api/ticket-categories')->assertStatus(200)->assertJsonStructure(['data' => [['id', 'name']]]);
    $this->getJson('/api/ticket-priorities')->assertStatus(200)->assertJsonStructure(['data' => [['id', 'name', 'sla_minutes']]]);
    $this->getJson('/api/ticket-statuses')->assertStatus(200)->assertJsonStructure(['data' => [['id', 'name']]]);
});

test('admin can manage department (create, show, update, delete)', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    // Create
    $res = $this->postJson('/api/departments', [
        'name' => 'Legal & Compliance',
        'description' => 'Legal Dept',
    ]);
    $res->assertStatus(201)
        ->assertJsonPath('data.name', 'Legal & Compliance');
    $deptId = $res->json('data.id');

    // Show
    $this->getJson("/api/departments/{$deptId}")
        ->assertStatus(200)
        ->assertJsonPath('data.name', 'Legal & Compliance');

    // Update
    $this->putJson("/api/departments/{$deptId}", [
        'name' => 'Legal & Corporate Affairs',
        'description' => 'Updated desc',
    ])->assertStatus(200)
        ->assertJsonPath('data.name', 'Legal & Corporate Affairs');

    // Delete
    $this->deleteJson("/api/departments/{$deptId}")
        ->assertStatus(200);

    expect(Department::find($deptId))->toBeNull();
});

test('cannot delete department in use by user (409)', function () {
    $dept = Department::factory()->create();
    User::factory()->create(['department_id' => $dept->id]);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/departments/{$dept->id}")
        ->assertStatus(409)
        ->assertJsonPath('message', 'Departemen masih digunakan oleh 1 data terkait dan tidak dapat dihapus.');
});

test('admin can manage ticket category (create, show, update, delete)', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    // Create
    $res = $this->postJson('/api/ticket-categories', [
        'name' => 'Cybersecurity',
        'description' => 'Security incidents and phishing',
    ]);
    $res->assertStatus(201)
        ->assertJsonPath('data.name', 'Cybersecurity');
    $catId = $res->json('data.id');

    // Show
    $this->getJson("/api/ticket-categories/{$catId}")
        ->assertStatus(200)
        ->assertJsonPath('data.name', 'Cybersecurity');

    // Update
    $this->putJson("/api/ticket-categories/{$catId}", [
        'name' => 'Cybersecurity & InfoSec',
        'description' => 'Updated desc',
    ])->assertStatus(200)
        ->assertJsonPath('data.name', 'Cybersecurity & InfoSec');

    // Delete
    $this->deleteJson("/api/ticket-categories/{$catId}")
        ->assertStatus(200);

    expect(TicketCategory::find($catId))->toBeNull();
});

test('cannot delete ticket category with children (409)', function () {
    $parent = TicketCategory::factory()->create();
    TicketCategory::factory()->create(['parent_id' => $parent->id]);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/ticket-categories/{$parent->id}")
        ->assertStatus(409);
});

test('cannot delete ticket category used by tickets (409)', function () {
    $cat = TicketCategory::factory()->create();
    Ticket::factory()->create(['category_id' => $cat->id]);

    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    $this->deleteJson("/api/ticket-categories/{$cat->id}")
        ->assertStatus(409);
});

test('admin can manage ticket priority and updating sla_minutes does not affect existing tickets', function () {
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);

    // Create
    $res = $this->postJson('/api/ticket-priorities', [
        'name' => 'Urgent VIP',
        'level' => 5,
        'sla_minutes' => 60,
        'description' => '1 hour SLA',
    ]);
    $res->assertStatus(201)
        ->assertJsonPath('data.name', 'Urgent VIP')
        ->assertJsonPath('data.sla_minutes', 60);
    $prioId = $res->json('data.id');

    // Show
    $this->getJson("/api/ticket-priorities/{$prioId}")
        ->assertStatus(200)
        ->assertJsonPath('data.name', 'Urgent VIP');

    // Ticket snapshot verification
    $ticket = Ticket::factory()->create([
        'priority_id' => $prioId,
        'sla_duration_minutes' => 60,
    ]);

    // Update
    $this->putJson("/api/ticket-priorities/{$prioId}", [
        'name' => 'Urgent VIP Modified',
        'level' => 5,
        'sla_minutes' => 120,
        'description' => '2 hours SLA',
    ])->assertStatus(200)
        ->assertJsonPath('data.sla_minutes', 120);

    // Existing ticket snapshot remains intact
    expect($ticket->fresh()->sla_duration_minutes)->toBe(60);

    // Attempt delete when in use (409)
    $this->deleteJson("/api/ticket-priorities/{$prioId}")
        ->assertStatus(409);
});

test('non-admin cannot mutate master data', function () {
    $manager = User::factory()->manager()->create();
    Sanctum::actingAs($manager);

    $this->postJson('/api/departments', ['name' => 'Dept', 'code' => 'D'])->assertStatus(403);
    $this->postJson('/api/ticket-categories', ['name' => 'Cat'])->assertStatus(403);
    $this->postJson('/api/ticket-priorities', ['name' => 'Prio', 'level' => 10, 'sla_minutes' => 60])->assertStatus(403);
});
