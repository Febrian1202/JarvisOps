<?php

namespace App\Http\Controllers;

use App\DTOs\ChangePasswordData;
use App\DTOs\UpdateProfileData;
use App\Http\Requests\ChangePasswordRequest;
use App\Http\Requests\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\ProfileService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProfileController extends Controller
{
    public function __construct(private readonly ProfileService $profileService) {}

    public function show(Request $request): JsonResponse
    {
        $profile = $this->profileService->show($request->user());

        $payload = (new UserResource($profile['user']))->resolve();
        $payload['permissions'] = $profile['permissions'];

        return ApiResponse::success($payload, 'Profile retrieved successfully.');
    }

    public function update(UpdateProfileRequest $request): JsonResponse
    {
        $user = $this->profileService->update(
            $request->user(),
            UpdateProfileData::fromArray($request->validated()),
        );

        return ApiResponse::success(new UserResource($user), 'Profile updated successfully.');
    }

    public function updatePassword(ChangePasswordRequest $request): JsonResponse
    {
        $this->profileService->updatePassword(
            $request->user(),
            ChangePasswordData::fromArray($request->validated()),
        );

        return ApiResponse::success(null, 'Password updated successfully.');
    }
}
