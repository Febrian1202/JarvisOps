<?php

namespace App\Services\Auth;

use App\Authorization\AbilityMatrix;
use App\DTOs\Auth\ChangePasswordData;
use App\DTOs\Auth\UpdateProfileData;
use App\Enums\RoleName;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ProfileService
{
    /**
     * Load the authenticated user's profile and permissions.
     *
     * @return array{user: User, permissions: list<string>}
     */
    public function show(User $user): array
    {
        $user->load(['role', 'department', 'employeeProfile']);

        $role = RoleName::tryFrom($user->role?->name ?? '');
        $permissions = [];

        if ($role) {
            $permissions = AbilityMatrix::permissionsFor($role);
            $policyAbilities = AbilityMatrix::getPolicyAbilities();

            foreach ($policyAbilities as $ability) {
                // For admin, all policy abilities are allowed (except D-16 which are checked accordingly)
                if ($role === RoleName::Admin) {
                    $permissions[] = $ability;

                    continue;
                }

                // Check general role allowances for policy abilities
                if ($this->roleCanPerformPolicyAbility($role, $ability)) {
                    $permissions[] = $ability;
                }
            }
        }

        return [
            'user' => $user,
            'permissions' => array_values(array_unique($permissions)),
        ];
    }

    /**
     * Map policy abilities to roles based on PERMISSION-MATRIX.md §3.
     */
    private function roleCanPerformPolicyAbility(RoleName $role, string $ability): bool
    {
        return match ($role) {
            RoleName::Admin => true,
            RoleName::Manager => in_array($ability, [
                // Ticket (12 of 13, except selfAssign)
                'ticket.viewAny', 'ticket.view', 'ticket.create', 'ticket.update', 'ticket.assign',
                'ticket.unassign', 'ticket.changeStatus', 'ticket.changePriority', 'ticket.comment',
                'ticket.viewHistory', 'ticket.attach',
                // Attachment (4)
                'attachment.view', 'attachment.download', 'attachment.create', 'attachment.delete',
                // Asset (9 of 10, except admin-only delete is allowed for manager too)
                'asset.viewAny', 'asset.view', 'asset.viewOwn', 'asset.viewAssignable', 'asset.create',
                'asset.update', 'asset.delete', 'asset.assign', 'asset.release', 'asset.viewHistory',
                // Article (7)
                'article.viewAny', 'article.view', 'article.create', 'article.update', 'article.publish',
                'article.unpublish', 'article.delete',
                // Notification (3)
                'notification.viewAny', 'notification.markAsRead', 'notification.markAllAsRead',
            ], true),
            RoleName::Technician => in_array($ability, [
                // Ticket (10 of 13)
                'ticket.viewAny', 'ticket.view', 'ticket.create', 'ticket.update', 'ticket.changeStatus',
                'ticket.selfAssign', 'ticket.changePriority', 'ticket.comment', 'ticket.viewHistory', 'ticket.attach',
                // Attachment (4)
                'attachment.view', 'attachment.download', 'attachment.create', 'attachment.delete',
                // Asset (8 of 10)
                'asset.viewAny', 'asset.view', 'asset.viewOwn', 'asset.viewAssignable', 'asset.create',
                'asset.update', 'asset.assign', 'asset.release', 'asset.viewHistory',
                // Article (7)
                'article.viewAny', 'article.view', 'article.create', 'article.update', 'article.publish',
                'article.unpublish', 'article.delete',
                // Notification (3)
                'notification.viewAny', 'notification.markAsRead', 'notification.markAllAsRead',
            ], true),
            RoleName::Employee => in_array($ability, [
                // Ticket (8 of 13)
                'ticket.viewAny', 'ticket.view', 'ticket.create', 'ticket.update', 'ticket.changeStatus',
                'ticket.comment', 'ticket.viewHistory', 'ticket.attach',
                // Attachment (3)
                'attachment.view', 'attachment.download', 'attachment.create',
                // Asset (2)
                'asset.viewOwn', 'asset.viewAssignable',
                // Article (2)
                'article.viewAny', 'article.view',
                // Notification (3)
                'notification.viewAny', 'notification.markAsRead', 'notification.markAllAsRead',
            ], true),
        };
    }

    /**
     * Update the user's own profile (name and phone only).
     */
    public function update(User $user, UpdateProfileData $data): User
    {
        $user->update(['full_name' => $data->fullName]);

        if ($data->phone !== null) {
            $user->employeeProfile()->update(['phone' => $data->phone]);
        }

        return $user->load(['role', 'department', 'employeeProfile']);
    }

    /**
     * Change the user's password (D-11, D-12) and revoke all other tokens.
     */
    public function updatePassword(User $user, ChangePasswordData $data): void
    {
        if (! Hash::check($data->currentPassword, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        DB::transaction(function () use ($user, $data): void {
            $user->forceFill([
                'password' => $data->password,
                'must_change_password' => false,
            ])->save();

            $user->tokens()
                ->where('id', '!=', $user->currentAccessToken()->id)
                ->delete();
        });
    }
}
