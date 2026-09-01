<?php

namespace App\Policies;

use App\Models\Notification;
use App\Models\User;

/**
 * Notification access is strictly scoped to the owning user (PERMISSION-MATRIX §3.6,
 * DECISIONS D-16). Admin has no blanket exception here.
 */
class NotificationPolicy
{
    /**
     * Viewing the notification list is allowed for any authenticated user;
     * scoping is applied at query time.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * A user can mark a notification as read only if it belongs to them.
     */
    public function markAsRead(User $user, Notification $notification): bool
    {
        return $notification->user_id === $user->id;
    }

    /**
     * Mark-all is scoped to the authenticated user at query time.
     */
    public function markAllAsRead(User $user): bool
    {
        return true;
    }
}
