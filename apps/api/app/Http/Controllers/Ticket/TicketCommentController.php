<?php

namespace App\Http\Controllers\Ticket;

use App\DTOs\Ticket\CreateCommentData;
use App\DTOs\Ticket\UpdateCommentData;
use App\Http\Controllers\Controller;
use App\Http\Requests\Ticket\StoreCommentRequest;
use App\Http\Requests\Ticket\UpdateCommentRequest;
use App\Http\Resources\Ticket\TicketCommentResource;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Services\Ticket\TicketCommentService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketCommentController extends Controller
{
    public function __construct(
        protected TicketCommentService $commentService,
    ) {}

    public function index(Request $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('view', $ticket);

        $paginator = $this->commentService->paginate($ticket, $request);

        return ApiResponse::paginated($paginator, 'Comments retrieved successfully.', TicketCommentResource::class);
    }

    public function store(StoreCommentRequest $request, Ticket $ticket): JsonResponse
    {
        $this->authorize('comment', $ticket);

        $comment = $this->commentService->create(
            $ticket,
            CreateCommentData::fromArray($request->validated()),
            $request->user()
        );

        return ApiResponse::success(new TicketCommentResource($comment), 'Comment created successfully.', 201);
    }

    public function update(UpdateCommentRequest $request, Ticket $ticket, TicketComment $comment): JsonResponse
    {
        abort_if((int) $comment->ticket_id !== (int) $ticket->id, 404);

        $this->authorize('update', $comment);

        $comment = $this->commentService->update(
            $comment,
            UpdateCommentData::fromArray($request->validated()),
            $request->user()
        );

        return ApiResponse::success(new TicketCommentResource($comment), 'Comment updated successfully.');
    }

    public function destroy(Request $request, Ticket $ticket, TicketComment $comment): JsonResponse
    {
        abort_if((int) $comment->ticket_id !== (int) $ticket->id, 404);

        $this->authorize('delete', $comment);

        $this->commentService->delete($comment, $request->user());

        return ApiResponse::success(null, 'Comment deleted successfully.');
    }
}
