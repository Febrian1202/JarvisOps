<?php

namespace App\Services\Attachment;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentService
{
    public function __construct(
        protected AuditLogger $auditLogger
    ) {}

    public function store(Ticket $ticket, UploadedFile $file, User $actor): TicketAttachment
    {
        $ulid = (string) Str::ulid();
        $extension = strtolower($file->getClientOriginalExtension());
        $path = "tickets/{$ticket->id}/{$ulid}.{$extension}";

        // Store file physically on private disk
        Storage::disk('private')->put($path, $file->get());

        try {
            return DB::transaction(function () use ($ticket, $file, $actor, $path): TicketAttachment {
                $attachment = TicketAttachment::create([
                    'ticket_id' => $ticket->id,
                    'uploaded_by' => $actor->id,
                    'original_filename' => $file->getClientOriginalName(),
                    'stored_filename' => basename($path),
                    'mime_type' => $file->getMimeType(),
                    'file_size' => $file->getSize(),
                    'storage_path' => $path,
                ]);

                $attachment->load('uploader');

                $this->auditLogger->log(
                    $actor,
                    AuditAction::Create,
                    AuditModule::Ticket,
                    $ticket->id,
                    "File {$file->getClientOriginalName()} ditambahkan ke ticket #{$ticket->ticket_number}."
                );

                return $attachment;
            });
        } catch (\Throwable $e) {
            if (Storage::disk('private')->exists($path)) {
                Storage::disk('private')->delete($path);
            }
            throw $e;
        }
    }
}
