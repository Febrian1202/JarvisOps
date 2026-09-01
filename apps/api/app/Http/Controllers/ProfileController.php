<?php

namespace App\Http\Controllers;

use App\Authorization\AbilityMatrix;
use App\Enums\RoleName;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class ProfileController extends Controller
{
    /**
     * Show the authenticated user's profile and permissions.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user()->load(['role', 'department', 'employeeProfile']);

        $permissions = AbilityMatrix::permissionsFor(RoleName::from($user->role->name));

        return ApiResponse::success(
            $this->profilePayload($user, $permissions),
            'Profile retrieved successfully.',
        );
    }

    /**
     * Update the authenticated user's own profile (name and phone only).
     */
    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update($request->safe()->only(['full_name']));

        if ($request->filled('phone')) {
            $user->employeeProfile()->update(['phone' => $request->string('phone')]);
        }

        $user->load(['role', 'department', 'employeeProfile']);

        return ApiResponse::success(
            $this->profilePayload($user),
            'Profile updated successfully.',
        );
    }

    /**
     * Build the profile payload matching the API-CONTRACT §5 shape.
     *
     * @return array<string, mixed>
     */
    private function profilePayload(User $user, ?array $permissions = null): array
    {
        $payload = [
            'id' => $user->id,
            'email' => $user->email,
            'full_name' => $user->full_name,
            'role' => $user->role,
            'department' => $user->department,
            'profile' => $user->employeeProfile?->makeHidden([
                'id', 'user_id', 'hire_date', 'created_at', 'updated_at', 'deleted_at',
            ]),
        ];

        if ($permissions !== null) {
            $payload['permissions'] = $permissions;
        }

        return $payload;
    }

    /**
     * Change the authenticated user's password (D-11, D-12).
     */
    public function updatePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        if (! Hash::check($request->string('current_password'), $user->password)) {
            return ApiResponse::error('The given data was invalid.', errors: ['current_password' => ['The current password is incorrect.']], status: 422);
        }

        $user->forceFill([
            'password' => $request->string('password'),
            'must_change_password' => false,
        ])->save();

        $user->tokens()
            ->where('id', '!=', $request->user()->currentAccessToken()->id)
            ->delete();

        return ApiResponse::success(null, 'Password updated successfully.');
    }
}
