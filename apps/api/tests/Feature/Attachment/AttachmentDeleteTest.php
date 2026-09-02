<?php

use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

test('deleting attachment removes physical file and creates audit log', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $attachment = TicketAttachment::factory()->create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $reporter->id,
    ]);
    Storage::fake('private');
    Storage::disk('private')->put($attachment->storage_path, 'file-content');

    Sanctum::actingAs($reporter);
    $this->deleteJson("/api/attachments/{$attachment->id}")
        ->assertStatus(200)
        ->assertJson([
            'success' => true,
            'message' => 'Attachment deleted.',
        ]);

    Storage::disk('private')->assertMissing($attachment->storage_path);
    expect(TicketAttachment::find($attachment->id))->toBeNull();

    $log = AuditLog::where('action', 'delete')->first();
    expect($log)->not->toBeNull()
        ->and($log->module)->toBe('ticket')
        ->and($log->module_id)->toBe($ticket->id)
        ->and($log->user_id)->toBe($reporter->id);
});

test('employee cannot delete attachment they did not upload', function () {
    $employee = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $other->id]);
    $attachment = TicketAttachment::factory()->create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $other->id,
    ]);
    Storage::fake('private');

    Sanctum::actingAs($employee);
    $this->deleteJson("/api/attachments/{$attachment->id}")->assertStatus(403);
});

test('admin or manager can delete attachment uploaded by anyone', function () {
    $manager = User::factory()->manager()->create();
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    $attachment = TicketAttachment::factory()->create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $reporter->id,
    ]);
    Storage::fake('private');
    Storage::disk('private')->put($attachment->storage_path, 'file-content');

    Sanctum::actingAs($manager);
    $this->deleteJson("/api/attachments/{$attachment->id}")->assertStatus(200);
    Storage::disk('private')->assertMissing($attachment->storage_path);
    expect(TicketAttachment::find($attachment->id))->toBeNull();
});
