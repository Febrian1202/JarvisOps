<?php

use App\Models\Ticket;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;

test('attachment upload respects rate limit of 20 per minute', function () {
    $reporter = User::factory()->employee()->create();
    $ticket = Ticket::factory()->open()->create(['reporter_id' => $reporter->id]);
    Sanctum::actingAs($reporter);
    Storage::fake('private');

    foreach (range(1, 20) as $i) {
        $this->postJson("/api/tickets/{$ticket->id}/attachments", [
            'file' => UploadedFile::fake()->create("file{$i}.pdf", 10, 'application/pdf'),
        ])->assertStatus(201);
    }

    $this->postJson("/api/tickets/{$ticket->id}/attachments", [
        'file' => UploadedFile::fake()->create('file21.pdf', 10, 'application/pdf'),
    ])->assertStatus(429);
});

test('no public storage route serves attachment files', function () {
    $routes = collect(app('router')->getRoutes()->getRoutesByName());
    expect($routes->has('storage.local'))->toBeFalse();
});
