<?php

use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

test('attachments list returns metadata without storage path', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    TicketAttachment::factory()->count(2)->create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $reporter->id,
    ]);
    Sanctum::actingAs($reporter);

    $response = $this->getJson("/api/tickets/{$ticket->id}/attachments")
        ->assertStatus(200)
        ->assertJsonStructure([
            'success',
            'message',
            'data' => [
                '*' => [
                    'id',
                    'original_filename',
                    'mime_type',
                    'file_size',
                    'uploaded_by' => ['id', 'full_name'],
                    'download_url',
                    'created_at',
                ],
            ],
        ]);

    expect($response->json('data'))->toHaveCount(2);
    $response->assertJsonMissingPath('data.0.storage_path');
    $response->assertJsonMissingPath('data.0.stored_filename');
});

test('non-participant employee cannot list attachments (404)', function () {
    $employee = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $other->id]);
    TicketAttachment::factory()->create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $other->id,
    ]);

    Sanctum::actingAs($employee);
    $this->getJson("/api/tickets/{$ticket->id}/attachments")->assertStatus(404);
});
