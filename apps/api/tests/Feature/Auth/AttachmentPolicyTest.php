<?php

use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Gate;

uses(RefreshDatabase::class);

test('view and download delegate to ticket view policy', function () {
    $reporter = User::factory()->employee()->create();
    $nonParticipant = User::factory()->employee()->create();
    $technician = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $ticket = Ticket::factory()->open()->create([
        'reporter_id' => $reporter->id,
        'technician_id' => $technician->id,
    ]);

    $attachment = TicketAttachment::factory()->create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $reporter->id,
    ]);

    expect(Gate::forUser($reporter)->allows('view', $attachment))->toBeTrue()
        ->and(Gate::forUser($reporter)->allows('download', $attachment))->toBeTrue()
        ->and(Gate::forUser($technician)->allows('download', $attachment))->toBeTrue()
        ->and(Gate::forUser($manager)->allows('download', $attachment))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('download', $attachment))->toBeTrue()
        ->and(Gate::forUser($nonParticipant)->allows('view', $attachment))->toBeFalse()
        ->and(Gate::forUser($nonParticipant)->allows('download', $attachment))->toBeFalse();
});

test('create is allowed for any authenticated user passing controller gate', function () {
    $employee = User::factory()->employee()->create();
    $attachment = TicketAttachment::factory()->make();

    expect(Gate::forUser($employee)->allows('create', $attachment))->toBeTrue();
});

test('delete allows manager admin and uploader, but denies non-uploader technician or employee', function () {
    $uploader = User::factory()->employee()->create();
    $otherEmployee = User::factory()->employee()->create();
    $otherTech = User::factory()->technician()->create();
    $manager = User::factory()->manager()->create();
    $admin = User::factory()->admin()->create();

    $ticket = Ticket::factory()->open()->create(['reporter_id' => $uploader->id]);
    $attachment = TicketAttachment::factory()->create([
        'ticket_id' => $ticket->id,
        'uploaded_by' => $uploader->id,
    ]);

    expect(Gate::forUser($uploader)->allows('delete', $attachment))->toBeTrue()
        ->and(Gate::forUser($otherEmployee)->allows('delete', $attachment))->toBeFalse()
        ->and(Gate::forUser($otherTech)->allows('delete', $attachment))->toBeFalse()
        ->and(Gate::forUser($manager)->allows('delete', $attachment))->toBeTrue()
        ->and(Gate::forUser($admin)->allows('delete', $attachment))->toBeTrue();
});
