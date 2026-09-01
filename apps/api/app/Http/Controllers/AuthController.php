<?php

namespace App\Http\Controllers;

use App\Enums\UserStatus;
use App\Http\Requests\LoginRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(LoginRequest $request): JsonResponse
    {
        $user = User::where('email', $request->string('email'))
            ->with(['role', 'department'])
            ->first();

        if (! $user || ! Hash::check($request->string('password'), $user->password)) {
            return ApiResponse::error('The given data was invalid.', errors: ['email' => ['These credentials do not match our records.']], status: 422);
        }

        if ($user->status !== UserStatus::Active->value) {
            return ApiResponse::error('The given data was invalid.', errors: ['email' => ['This account is inactive.']], status: 422);
        }

        $user->forceFill(['last_login_at' => now()])->save();

        $token = $user->createToken('auth_token', ['*'])->plainTextToken;

        return ApiResponse::success([
            'token' => $token,
            'user' => $user,
        ], 'Login successful.');
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return ApiResponse::success(null, 'Logout successful.');
    }
}
