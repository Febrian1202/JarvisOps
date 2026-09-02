<?php

namespace App\Http\Controllers\Attachment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attachment\StoreAttachmentRequest;
use App\Http\Resources\Attachment\AttachmentResource;
use App\Models\Ticket;
use App\Models\TicketAttachment;
use App\Services\Attachment\AttachmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class AttachmentController extends Controller
{
    public function __construct(
        protected AttachmentService $attachmentService
    ) {}

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
}
