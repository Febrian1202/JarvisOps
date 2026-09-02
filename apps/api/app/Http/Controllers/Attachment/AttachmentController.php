<?php

namespace App\Http\Controllers\Attachment;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attachment\StoreAttachmentRequest;
use App\Http\Resources\Attachment\AttachmentResource;
use App\Models\Ticket;
use App\Services\Attachment\AttachmentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

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
}
