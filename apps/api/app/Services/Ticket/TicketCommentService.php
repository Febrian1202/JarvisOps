<?php

namespace App\Services\Ticket;

use App\DTOs\Ticket\CreateCommentData;
use App\DTOs\Ticket\UpdateCommentData;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Enums\NotificationType;
use App\Models\Ticket;
use App\Models\TicketComment;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Notification\NotificationService;
use App\Support\HandlesPagination;
use Illuminate\Http\Request;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Facades\DB;

class TicketCommentService
{
    use HandlesPagination;

    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly NotificationService $notificationService,
    ) {}

    public function paginate(Ticket $ticket, Request $request): LengthAwarePaginator
    {
        return $ticket->comments()
            ->with('user:id,full_name')
            ->orderBy('created_at', 'asc')
            ->paginate($this->getPerPage($request));
    }

    public function create(Ticket $ticket, CreateCommentData $data, User $actor): TicketComment
    {
        return DB::transaction(function () use ($ticket, $data, $actor): TicketComment {
            $comment = TicketComment::create([
                'ticket_id' => $ticket->id,
                'user_id' => $actor->id,
                'body' => $data->body,
            ]);

            $this->auditLogger->log(
                $actor,
                AuditAction::Create,
                AuditModule::Ticket,
                $ticket->id,
                "Komentar ditambahkan pada Ticket #{$ticket->ticket_number}."
            );

            // Notify other participants (D-27: TICKET_COMMENTED)
            $participantIds = collect([$ticket->reporter_id, $ticket->technician_id])
                ->filter()
                ->unique()
                ->reject(fn ($id) => $id === $actor->id);

            if ($participantIds->isNotEmpty()) {
                $recipients = User::query()->whereIn('id', $participantIds)->get();
                $this->notificationService->notifyMany(
                    $recipients,
                    NotificationType::TicketCommented,
                    [
                        'ticket_id' => $ticket->id,
                        'ticket_number' => $ticket->ticket_number,
                        'title' => $ticket->title,
                        'actor_name' => $actor->full_name,
                        'message' => "{$actor->full_name} menambahkan komentar pada ticket #{$ticket->ticket_number}.",
                        'url' => "/tickets/{$ticket->id}",
                    ],
                    $actor
                );
            }

            return $comment->load('user:id,full_name');
        });
    }

    public function update(TicketComment $comment, UpdateCommentData $data, User $actor): TicketComment
    {
        return DB::transaction(function () use ($comment, $data, $actor): TicketComment {
            $oldBody = $comment->body;
            $comment->body = $data->body;
            $comment->save();

            $ticket = $comment->ticket;

            $this->auditLogger->log(
                $actor,
                AuditAction::Update,
                AuditModule::Ticket,
                $comment->ticket_id,
                "Komentar pada Ticket #{$ticket?->ticket_number} diperbarui.",
                ['body' => $oldBody],
                ['body' => $comment->body]
            );

            return $comment->load('user:id,full_name');
        });
    }

    public function delete(TicketComment $comment, User $actor): void
    {
        DB::transaction(function () use ($comment, $actor): void {
            $comment->delete();
            $ticket = $comment->ticket;

            $this->auditLogger->log(
                $actor,
                AuditAction::Delete,
                AuditModule::Ticket,
                $comment->ticket_id,
                "Komentar pada Ticket #{$ticket?->ticket_number} dihapus."
            );
        });
    }
}
