<?php

namespace App\Services\User;

use App\DTOs\User\CreateUserData;
use App\DTOs\User\UpdateUserData;
use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Enums\UserStatus;
use App\Exceptions\StateConflictException;
use App\Models\AssetAssignment;
use App\Models\EmployeeProfile;
use App\Models\KnowledgeArticle;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class UserService
{
    public function __construct(
        protected AuditLogger $auditLogger,
    ) {}

    public function create(CreateUserData $data, User $actor): User
    {
        return DB::transaction(function () use ($data, $actor): User {
            $user = User::create([
                'role_id' => $data->roleId,
                'department_id' => $data->departmentId,
                'email' => $data->email,
                'password' => $data->password,
                'full_name' => $data->fullName,
                'status' => $data->status,
                'must_change_password' => true,
            ]);

            if (! empty($data->profile)) {
                EmployeeProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    array_filter([
                        'employee_code' => $data->profile['employee_code'] ?? null,
                        'phone' => $data->profile['phone'] ?? null,
                        'position' => $data->profile['position'] ?? null,
                        'hire_date' => $data->profile['hire_date'] ?? null,
                    ], fn ($v) => $v !== null),
                );
            }

            $this->auditLogger->log(
                $actor,
                AuditAction::Create,
                AuditModule::User,
                $user->id,
                "User {$user->full_name} ({$user->email}) dibuat."
            );

            return $user->load(['role', 'department', 'employeeProfile']);
        });
    }

    public function update(User $user, UpdateUserData $data, User $actor): User
    {
        if ($user->is($actor) && $data->roleId !== null && $data->roleId !== (int) $user->role_id) {
            throw new AccessDeniedHttpException('Admin cannot change their own role.');
        }

        return DB::transaction(function () use ($user, $data, $actor): User {
            $old = $user->only(['full_name', 'email', 'department_id', 'role_id']);

            $updatePayload = [
                'full_name' => $data->fullName,
                'email' => $data->email,
                'department_id' => $data->departmentId,
            ];

            if ($data->roleId !== null) {
                $updatePayload['role_id'] = $data->roleId;
            }

            $user->update($updatePayload);

            if ($data->profile !== null) {
                EmployeeProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    array_filter([
                        'employee_code' => $data->profile['employee_code'] ?? null,
                        'phone' => $data->profile['phone'] ?? null,
                        'position' => $data->profile['position'] ?? null,
                        'hire_date' => $data->profile['hire_date'] ?? null,
                    ], fn ($v) => $v !== null),
                );
            }

            $this->auditLogger->log(
                $actor,
                AuditAction::Update,
                AuditModule::User,
                $user->id,
                "User {$user->full_name} diperbarui.",
                $old,
                $user->only(['full_name', 'email', 'department_id', 'role_id'])
            );

            return $user->fresh()->load(['role', 'department', 'employeeProfile']);
        });
    }

    public function delete(User $user, User $actor): void
    {
        if ($user->is($actor)) {
            throw new AccessDeniedHttpException('Admin cannot delete their own account.');
        }

        DB::transaction(function () use ($user, $actor): void {
            $hasRefs = Ticket::where('reporter_id', $user->id)->exists()
                || Ticket::where('technician_id', $user->id)->exists()
                || KnowledgeArticle::where('author_id', $user->id)->exists()
                || AssetAssignment::where('user_id', $user->id)->exists();

            if ($hasRefs) {
                throw new StateConflictException('User masih memiliki riwayat atau rujukan aktif dan tidak dapat dihapus. Gunakan deaktivasi.');
            }

            $userName = $user->full_name;
            $userId = $user->id;

            $user->tokens()->delete();
            $user->employeeProfile?->delete();
            $user->delete();

            $this->auditLogger->log(
                $actor,
                AuditAction::Delete,
                AuditModule::User,
                $userId,
                "User {$userName} dihapus."
            );
        });
    }

    public function resetPassword(User $user, User $actor): string
    {
        if ($user->is($actor)) {
            throw new AccessDeniedHttpException('Admin cannot reset their own password.');
        }

        $password = Str::password(12, symbols: false).'1a';

        return DB::transaction(function () use ($user, $actor, $password): string {
            $user->update([
                'password' => $password,
                'must_change_password' => true,
            ]);
            $user->tokens()->delete();

            $this->auditLogger->log(
                $actor,
                AuditAction::PasswordReset,
                AuditModule::User,
                $user->id,
                "Password user {$user->full_name} di-reset."
            );

            return $password;
        });
    }

    public function deactivate(User $user, User $actor): User
    {
        if ($user->is($actor)) {
            throw new AccessDeniedHttpException('Admin cannot deactivate their own account.');
        }

        return DB::transaction(function () use ($user, $actor): User {
            $user->update(['status' => UserStatus::Inactive->value]);
            $user->tokens()->delete();

            $this->auditLogger->log(
                $actor,
                AuditAction::Deactivate,
                AuditModule::User,
                $user->id,
                "User {$user->full_name} dinonaktifkan."
            );

            return $user->fresh()->load(['role', 'department', 'employeeProfile']);
        });
    }

    public function activate(User $user, User $actor): User
    {
        return DB::transaction(function () use ($user, $actor): User {
            $user->update(['status' => UserStatus::Active->value]);

            $this->auditLogger->log(
                $actor,
                AuditAction::Activate,
                AuditModule::User,
                $user->id,
                "User {$user->full_name} diaktifkan kembali."
            );

            return $user->fresh()->load(['role', 'department', 'employeeProfile']);
        });
    }
}
