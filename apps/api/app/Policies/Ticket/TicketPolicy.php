<?php

namespace App\Policies\Ticket;

use App\Enums\RoleName;
use App\Models\Ticket;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class TicketPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Ticket $ticket): Response|bool
    {
        if ($user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician)) {
            return true;
        }

        return $ticket->reporter_id === $user->id
            ? true
            : Response::denyAsNotFound();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Ticket $ticket): Response|bool
    {
        if ((bool) ($ticket->status?->is_closed ?? false) || (int) $ticket->status_id === 5) {
            return false;
        }

        if ($user->isAdmin() || $user->hasRole(RoleName::Manager, RoleName::Technician)) {
            return true;
        }

        return $ticket->reporter_id === $user->id
            ? true
            : Response::denyAsNotFound();
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin();
    }

    public function assign(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager);
    }

    public function unassign(User $user, Ticket $ticket): bool
    {
        return $user->isAdmin() || $user->hasRole(RoleName::Manager);
    }

    public function changeStatus(User $user, Ticket $ticket): Response|bool
    {
        if ($user->isAdmin() || $user->hasRole(RoleName::Manager)) {
            return true;
        }

        if ($user->hasRole(RoleName::Technician)) {
            if ($ticket->technician_id === $user->id) {
                return true;
            }

            if ((int) $ticket->status_id === 1 && $ticket->technician_id === null) {
                return true;
            }

            return false;
        }

        return $ticket->reporter_id === $user->id
            ? true
            : Response::denyAsNotFound();
    }

    public function selfAssign(User $user, Ticket $ticket): bool
    {
        return $user->hasRole(RoleName::Technician) && (int) $ticket->status_id === 1 && $ticket->technician_id === null;
    }

    public function changePriority(User $user, Ticket $ticket): bool
    {
        if ($user->isAdmin() || $user->hasRole(RoleName::Manager)) {
            return true;
        }

        if ($user->hasRole(RoleName::Technician)) {
            return $ticket->technician_id === $user->id;
        }

        return false;
    }

    public function comment(User $user, Ticket $ticket): Response|bool
    {
        return $this->isParticipant($user, $ticket);
    }

    public function viewHistory(User $user, Ticket $ticket): Response|bool
    {
        return $this->view($user, $ticket);
    }

    public function attach(User $user, Ticket $ticket): Response|bool
    {
        return $this->isParticipant($user, $ticket);
    }

    protected function isParticipant(User $user, Ticket $ticket): Response|bool
    {
        if ($user->isAdmin() || $user->hasRole(RoleName::Manager)) {
            return true;
        }

        if ($user->hasRole(RoleName::Technician)) {
            return $ticket->technician_id === $user->id;
        }

        return $ticket->reporter_id === $user->id
            ? true
            : Response::denyAsNotFound();
    }
}
