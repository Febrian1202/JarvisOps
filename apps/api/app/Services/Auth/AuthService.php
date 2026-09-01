<?php

namespace App\Services\Auth;

use App\DTOs\Auth\LoginData;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthService
{
    /**
     * Authenticate a user and issue a Sanctum token.
     *
     * @return array{token: string, user: User}
     */
    public function login(LoginData $data): array
    {
        $user = User::where('email', $data->email)
            ->with(['role', 'department'])
            ->first();

        if (! $user || ! Hash::check($data->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['These credentials do not match our records.'],
            ]);
        }

        if ($user->status !== UserStatus::Active->value) {
            throw ValidationException::withMessages([
                'email' => ['This account is inactive.'],
            ]);
        }

        return DB::transaction(function () use ($user): array {
            $user->forceFill(['last_login_at' => now()])->save();

            $token = $user->createToken('auth_token', ['*'])->plainTextToken;

            return [
                'token' => $token,
                'user' => $user,
            ];
        });
    }

    /**
     * Revoke the current access token.
     */
    public function logout(User $user): void
    {
        $user->currentAccessToken()?->delete();
    }
}
