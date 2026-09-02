<?php

use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

test('attachment is stored on private disk with generated filename and audit log', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);
    Storage::fake('private');

    $response = $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('my-screenshot.png', 200, 'image/png'),
    ])->assertStatus(201);

    $row = TicketAttachment::first();
    expect($row)->not->toBeNull()
        ->and($row->storage_path)->toMatch('/^tickets\/'.$ticket->id.'\/.+\.png$/')
        ->and($row->stored_filename)->not->toBe('my-screenshot.png')
        ->and($row->mime_type)->toBe('image/png')
        ->and($row->file_size)->toBe(200 * 1024)
        ->and($row->original_filename)->toBe('my-screenshot.png')
        ->and($row->uploaded_by)->toBe($reporter->id);

    Storage::disk('private')->assertExists($row->storage_path);

    $response->assertJson([
        'success' => true,
        'message' => 'Attachment uploaded successfully.',
        'data' => [
            'id' => $row->id,
            'original_filename' => 'my-screenshot.png',
            'mime_type' => 'image/png',
            'file_size' => 200 * 1024,
            'uploaded_by' => [
                'id' => $reporter->id,
                'full_name' => $reporter->full_name,
            ],
            'download_url' => "/api/attachments/{$row->id}/download",
        ],
    ]);

    expect(AuditLog::count())->toBe(1);
    $log = AuditLog::first();
    expect($log->module)->toBe('ticket')
        ->and($log->action)->toBe('create')
        ->and($log->module_id)->toBe($ticket->id)
        ->and($log->user_id)->toBe($reporter->id);
});

test('non-participant employee cannot upload attachment to ticket', function () {
    $employee = User::factory()->employee()->create();
    $other = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $other->id]);
    Sanctum::actingAs($employee);
    Storage::fake('private');

    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.png', 100, 'image/png'),
    ])->assertStatus(404);
});
