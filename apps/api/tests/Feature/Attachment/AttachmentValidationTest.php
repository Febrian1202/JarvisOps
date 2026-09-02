<?php

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

test('participant can upload valid pdf', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);

    Storage::fake('private');
    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('screenshot.pdf', 100, 'application/pdf'),
    ])->assertStatus(201)
        ->assertJsonStructure(['data' => ['id', 'original_filename', 'mime_type', 'file_size', 'download_url', 'uploaded_by']]);
});

test('upload over 5MB returns 422', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);

    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('big.pdf', 6000, 'application/pdf'),
    ])->assertStatus(422)->assertJsonValidationErrors('file');
});

test('exe file rejected', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);

    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('malware.exe', 100, 'application/x-msdownload'),
    ])->assertStatus(422)->assertJsonValidationErrors('file');
});

test('sh file rejected', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);

    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('script.sh', 100, 'text/x-shellscript'),
    ])->assertStatus(422)->assertJsonValidationErrors('file');
});

test('bat file rejected', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);

    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('script.bat', 100, 'application/x-bat'),
    ])->assertStatus(422)->assertJsonValidationErrors('file');
});

test('mime type mismatch with extension rejected', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);

    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('fake.pdf', 100, 'application/x-msdownload'),
    ])->assertStatus(422)->assertJsonValidationErrors('file');
});
