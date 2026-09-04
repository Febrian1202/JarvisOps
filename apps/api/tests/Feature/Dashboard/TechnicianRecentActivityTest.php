<?php

use App\Models\Ticket;
use App\Models\TicketHistory;
use App\Models\User;
use Database\Seeders\ReferenceDataSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

beforeEach(fn () => $this->seed(ReferenceDataSeeder::class));

test('technician recent activity includes ticket number and title', function () {
    $tech = User::factory()->technician()->create();
    $ticket = Ticket::factory()->inProgress()->create(['technician_id' => $tech->id]);
    TicketHistory::factory()->create([
        'ticket_id' => $ticket->id,
        'user_id' => $tech->id,
        'field_changed' => 'status_id',
        'new_value' => '3',
    ]);

    Sanctum::actingAs($tech);
    $response = $this->getJson('/api/dashboard/technician');
    $activity = $response->json('data.recent_activity');

    expect($activity)->toHaveCount(1)
        ->and($activity[0])->toHaveKey('ticket')
        ->and($activity[0]['ticket']['ticket_number'])->toBe($ticket->ticket_number)
        ->and($activity[0]['ticket']['title'])->toBe($ticket->title);
});

test('ticket history endpoint without ticket relation stays unchanged and does not include ticket key', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    TicketHistory::factory()->create([
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'field_changed' => 'status_id',
        'new_value' => 'OPEN',
    ]);

    Sanctum::actingAs($reporter);
    $response = $this->getJson("/api/tickets/{$ticket->id}/histories");
    $response->assertStatus(200);
    $histories = $response->json('data');

    expect($histories)->not->toBeEmpty();
    expect($histories[0])->not->toHaveKey('ticket');
});
