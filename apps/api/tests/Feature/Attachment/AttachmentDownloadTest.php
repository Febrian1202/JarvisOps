<?php

use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

test('reporter can download own ticket attachment', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $attachment = TicketAttachment::factory()->create(['ticket_id' => $ticket->id]);
    Storage::fake('private');
    Storage::disk('private')->put($attachment->storage_path, 'file-content');

    Sanctum::actingAs($reporter);
    $this->get("/api/attachments/{$attachment->id}/download")
        ->assertStatus(200)
        ->assertHeader('Content-Disposition', 'attachment; filename='.$attachment->original_filename);
});

test('employee cannot download attachment of non-participant ticket (404)', function () {
    $employee = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $other->id]);
    $attachment = TicketAttachment::factory()->create(['ticket_id' => $ticket->id]);
    Storage::fake('private');
    Storage::disk('private')->put($attachment->storage_path, 'x');

    Sanctum::actingAs($employee);
    $this->get("/api/attachments/{$attachment->id}/download")->assertStatus(404);
});

test('downloading missing physical file returns 404', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $attachment = TicketAttachment::factory()->create(['ticket_id' => $ticket->id]);
    Storage::fake('private');

    Sanctum::actingAs($reporter);
    $this->get("/api/attachments/{$attachment->id}/download")->assertStatus(404);
});
