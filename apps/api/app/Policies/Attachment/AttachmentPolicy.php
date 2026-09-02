<?php

namespace App\Policies\Attachment;

use App\Enums\RoleName;
use App\Models\TicketAttachment;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AttachmentPolicy
{
    public function view(User $user, TicketAttachment $attachment): Response|bool
    {
        return $user->can('view', $attachment->ticket)
            ? true
            : Response::denyAsNotFound();
    }

    public function download(User $user, TicketAttachment $attachment): Response|bool
    {
        return $this->view($user, $attachment);
    }

    public function create(User $user, TicketAttachment $attachment): bool
    {
        return true;
    }

    public function delete(User $user, TicketAttachment $attachment): bool
    {
        if ($user->isAdmin() || $user->hasRole(RoleName::Manager)) {
            return true;
        }

        return $attachment->uploaded_by === $user->id;
    }
}
