<?php

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket');

test('employee sees only own tickets', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->open()->count(3)->create(['reporter_id' => $employee->id]);
    Ticket::factory()->open()->count(5)->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/tickets')->assertJsonPath('meta.total', 3);
});

test('employee filter by reporter_id is ignored', function () {
    $employee = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();
    Ticket::factory()->open()->create(['reporter_id' => $other->id]);
    Sanctum::actingAs($employee);

    $this->getJson('/api/tickets?reporter_id='.$other->id)->assertJsonPath('meta.total', 0);
});

test('filter by sla_status breached and on_track', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->breached()->count(2)->create(['reporter_id' => $employee->id]);
    Ticket::factory()->open()->count(3)->create(['reporter_id' => $employee->id]);
    Sanctum::actingAs($employee);

    $this->getJson('/api/tickets?sla_status=breached')->assertJsonPath('meta.total', 2);
    $this->getJson('/api/tickets?sla_status=on_track')->assertJsonPath('meta.total', 3);
});

test('search matches ticket_number and title', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->open()->create(['ticket_number' => 'TCK-9999', 'reporter_id' => $employee->id]);
    Ticket::factory()->open()->create(['title' => 'Laptop rusak', 'reporter_id' => $employee->id]);
    Sanctum::actingAs($employee);

    $this->getJson('/api/tickets?search=9999')->assertJsonPath('meta.total', 1);
    $this->getJson('/api/tickets?search=Laptop')->assertJsonPath('meta.total', 1);
});

test('search sanitizes wildcards', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->open()->count(3)->create(['reporter_id' => $employee->id]);
    Sanctum::actingAs($employee);

    $this->getJson('/api/tickets?search=%')->assertJsonPath('meta.total', 0);
    $this->getJson('/api/tickets?search=_')->assertJsonPath('meta.total', 0);
});

test('invalid sort_by returns 422', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/tickets?sort_by=password')
        ->assertStatus(422)
        ->assertJsonValidationErrors('sort_by');
});

test('meta has exactly six keys and no links', function () {
    $employee = User::factory()->employee()->create();
    Ticket::factory()->open()->count(5)->create(['reporter_id' => $employee->id]);
    Sanctum::actingAs($employee);

    $response = $this->getJson('/api/tickets?per_page=2');
    $response->assertJsonStructure(['meta' => ['current_page', 'per_page', 'total', 'last_page', 'from', 'to']]);
    expect($response->json('meta'))->toHaveCount(6);
    expect($response->json('meta'))->not->toHaveKey('links');
});

test('per_page is capped at 100', function () {
    $employee = User::factory()->employee()->create();
    Sanctum::actingAs($employee);

    $this->getJson('/api/tickets?per_page=500')->assertJsonPath('meta.per_page', 100);
});

test('list query count does not increase with more tickets', function () {
    $queries = [];
    DB::listen(function ($query) use (&$queries) {
        $queries[] = $query;
    });
    $admin = User::factory()->admin()->create();
    Sanctum::actingAs($admin);
    $admin->role;

    Ticket::factory()->open()->create();
    $queries = [];
    $this->getJson('/api/tickets');
    $count1 = count($queries);

    Ticket::factory()->open()->count(9)->create();
    $queries = [];
    $this->getJson('/api/tickets');
    $count2 = count($queries);

    expect($count2)->toBe($count1);
});
