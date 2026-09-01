<?php

namespace App\Policies;

use App\Models\TicketComment;
use App\Models\User;
use Illuminate\Support\Carbon;

class TicketCommentPolicy
{
    public function update(User $user, TicketComment $comment): bool
    {
        if ($user->isAdmin()) {
            return true;
        }

        if ($comment->user_id !== $user->id) {
            return false;
        }

        $createdAt = Carbon::parse($comment->created_at);

        return $createdAt->diffInMinutes(now()) <= 15;
    }

    public function delete(User $user, TicketComment $comment): bool
    {
        return $this->update($user, $comment);
    }
}
