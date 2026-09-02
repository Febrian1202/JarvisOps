<?php

namespace App\Http\Controllers\Attachment;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Attachment\StoreAttachmentRequest;
use App\Http\Resources\Attachment\AttachmentResource;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Services\Attachment\AttachmentService;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AttachmentController extends Controller
{
    public function __construct(
        protected AttachmentService $attachmentService,
        protected AuditLogger $auditLogger
    ) {}

    public function index(Ticket $ticket, Request $request): JsonResponse
    {
        $this->authorize('view', $ticket);

        $attachments = $ticket->attachments()
            ->with('uploader')
            ->orderBy('created_at')
            ->get();

        return ApiResponse::success(
            AttachmentResource::collection($attachments),
            'Attachments retrieved.'
        );
    }

    public function store(StoreAttachmentRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('attach', $ticket);

        $attachment = $this->attachmentService->store($ticket, $request->file('file'), $request->user());

        return ApiResponse::success(
            new AttachmentResource($attachment),
            'Attachment uploaded successfully.',
            status: 201
        );
    }

    public function download(TicketAttachment $attachment): StreamedResponse
    {
        $this->authorize('download', $attachment);

        $filePath = $attachment->storage_path;

        if (! Storage::disk('private')->exists($filePath)) {
            throw new NotFoundHttpException('Attachment file not found.');
        }

        return Storage::disk('private')->download($filePath, $attachment->original_filename, [
            'Content-Type' => $attachment->mime_type,
        ]);
    }

    public function destroy(TicketAttachment $attachment, Request $request): JsonResponse
    {
        $this->authorize('delete', $attachment);

        $attachment->delete();

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Delete,
            AuditModule::Ticket,
            $attachment->ticket_id,
            "File {$attachment->original_filename} dihapus dari ticket."
        );

        return ApiResponse::success(null, 'Attachment deleted.');
    }
}
