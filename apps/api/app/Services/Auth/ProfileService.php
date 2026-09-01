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
        $permissions = $role ? AbilityMatrix::permissionsFor($role) : [];

        return [
            'user' => $user,
            'permissions' => $permissions,
        ];
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
