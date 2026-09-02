<?php

use App\Enums\NotificationType;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\User;
use Laravel\Sanctum\Sanctum;

uses()->group('ticket', 'comment');

test('participant can add comment to open ticket and receives 201', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($reporter);
    $response = $this->postJson("/api/tickets/{$ticket->id}/comments", [
        'body' => 'Sudah dicek oleh IT.',
    ]);

    $response->assertStatus(201)
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Comment created successfully.')
        ->assertJsonPath('data.body', 'Sudah dicek oleh IT.')
        ->assertJsonPath('data.ticket_id', $ticket->id)
        ->assertJsonPath('data.user.id', $reporter->id)
        ->assertJsonPath('data.user.full_name', $reporter->full_name);

    $this->assertDatabaseHas('ticket_comments', [
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'body' => 'Sudah dicek oleh IT.',
    ]);
});

test('non-participant employee cannot comment and receives 404', function () {
    $reporter = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($other);
    $this->postJson("/api/tickets/{$ticket->id}/comments", ['body' => 'Komentar nyasar'])
        ->assertStatus(404);
});

test('unassigned technician cannot comment and receives 404', function () {
    $assignedTech = User::factory()->technician()->create();
    $otherTech = User::factory()->technician()->create();
    $ticket = Ticket::factory()->inProgress()->create(['technician_id' => $assignedTech->id]);

    Sanctum::actingAs($otherTech);
    $this->postJson("/api/tickets/{$ticket->id}/comments", ['body' => 'Bukan tiket saya'])
        ->assertStatus(404);
});

test('comment on closed ticket is rejected with 403', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->closed()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($reporter);
    $this->postJson("/api/tickets/{$ticket->id}/comments", ['body' => 'Tiket sudah ditutup'])
        ->assertStatus(403);
});

test('validation error returns 422 with Indonesian messages', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    Sanctum::actingAs($reporter);
    $this->postJson("/api/tickets/{$ticket->id}/comments", [])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['body'])
        ->assertJsonPath('errors.body.0', 'Isi komentar wajib diisi.');
});

test('comments are paginated and ordered in ascending creation order', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);

    TicketComment::create([
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'body' => 'Komentar pertama',
        'created_at' => now()->subMinutes(10),
    ]);
    TicketComment::create([
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'body' => 'Komentar kedua',
        'created_at' => now()->subMinutes(5),
    ]);

    Sanctum::actingAs($reporter);
    $response = $this->getJson("/api/tickets/{$ticket->id}/comments")
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.body', 'Komentar pertama')
        ->assertJsonPath('data.1.body', 'Komentar kedua');
});

test('comment notifies other participants but not the author', function () {
    $reporter = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $ticket = Ticket::factory()->assigned()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    Sanctum::actingAs($reporter);
    $this->postJson("/api/tickets/{$ticket->id}/comments", ['body' => 'Halo teknisi'])
        ->assertStatus(201);

    // Technician receives notification
    $this->assertDatabaseHas('notifications', [
        'user_id' => $technician->id,
        'type' => NotificationType::TicketCommented->value,
    ]);

    // Reporter does not receive notification
    $this->assertDatabaseMissing('notifications', [
        'user_id' => $reporter->id,
        'type' => NotificationType::TicketCommented->value,
    ]);
});

test('author can update comment within 15 minutes', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $comment = TicketComment::create([
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'body' => 'Komentar asli',
        'created_at' => now()->subMinutes(5),
    ]);

    Sanctum::actingAs($reporter);
    $this->putJson("/api/tickets/{$ticket->id}/comments/{$comment->id}", [
        'body' => 'Komentar telah direvisi',
    ])->assertStatus(200)
        ->assertJsonPath('data.body', 'Komentar telah direvisi');

    $this->assertDatabaseHas('ticket_comments', [
        'id' => $comment->id,
        'body' => 'Komentar telah direvisi',
    ]);
});

test('author cannot update comment after 15 minutes', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $comment = TicketComment::factory()->create([
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'body' => 'Komentar kadaluarsa',
        'created_at' => now()->subMinutes(16),
    ]);

    Sanctum::actingAs($reporter);
    $this->putJson("/api/tickets/{$ticket->id}/comments/{$comment->id}", [
        'body' => 'Coba edit lewat batas',
    ])->assertStatus(403);
});

test('admin can update any comment regardless of 15 minutes window', function () {
    $admin = User::factory()->admin()->create();
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $comment = TicketComment::factory()->create([
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'body' => 'Komentar lama',
        'created_at' => now()->subMinutes(60),
    ]);

    Sanctum::actingAs($admin);
    $this->putJson("/api/tickets/{$ticket->id}/comments/{$comment->id}", [
        'body' => 'Diedit oleh Admin',
    ])->assertStatus(200)
        ->assertJsonPath('data.body', 'Diedit oleh Admin');
});

test('author can delete comment within 15 minutes and it is soft deleted', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $comment = TicketComment::create([
        'ticket_id' => $ticket->id,
        'user_id' => $reporter->id,
        'body' => 'Komentar akan dihapus',
        'created_at' => now()->subMinutes(5),
    ]);

    Sanctum::actingAs($reporter);
    $this->deleteJson("/api/tickets/{$ticket->id}/comments/{$comment->id}")
        ->assertStatus(200)
        ->assertJsonPath('success', true)
        ->assertJsonPath('message', 'Comment deleted successfully.');

    $this->assertSoftDeleted('ticket_comments', ['id' => $comment->id]);
});

test('comment route returns 404 if comment does not belong to ticket', function () {
    $reporter = User::factory()->employee()->create();
    $ticket1 = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $ticket2 = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $comment = TicketComment::create([
        'ticket_id' => $ticket1->id,
        'user_id' => $reporter->id,
        'body' => 'Komentar tiket 1',
    ]);

    Sanctum::actingAs($reporter);
    $this->putJson("/api/tickets/{$ticket2->id}/comments/{$comment->id}", ['body' => 'Mismatch'])
        ->assertStatus(404);
    $this->deleteJson("/api/tickets/{$ticket2->id}/comments/{$comment->id}")
        ->assertStatus(404);
});
