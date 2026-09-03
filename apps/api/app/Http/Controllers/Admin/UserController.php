<?php

namespace App\Http\Controllers\Admin;

use App\DTOs\User\CreateUserData;
use App\DTOs\User\UpdateUserData;
use App\Http\Controllers\Controller;
use App\Http\Requests\User\IndexUserRequest;
use App\Http\Requests\User\StoreUserRequest;
use App\Http\Requests\User\UpdateUserRequest;
use App\Http\Resources\User\UserAdminResource;
use App\Http\Resources\User\UserListResource;
use App\Models\Role;
use App\Models\User;
use App\Services\User\UserService;
use App\Support\ApiResponse;
use App\Support\HandlesPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    use HandlesPagination;

    public function __construct(
        protected UserService $userService,
    ) {}

    public function index(IndexUserRequest $request): JsonResponse
    {
        $this->authorize('user.viewAny');

        $query = User::query()
            ->with(['role', 'department', 'employeeProfile']);

        if ($search = $request->input('search')) {
            $sanitized = str_replace(['%', '_'], ['\%', '\_'], $search);
            $query->where(function ($q) use ($sanitized) {
                $q->where('full_name', 'like', "%{$sanitized}%")
                    ->orWhere('email', 'like', "%{$sanitized}%");
            });
        }

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->input('role_id'));
        }

        if ($request->filled('department_id')) {
            $query->where('department_id', $request->input('department_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        $this->applySorting($query, $request, ['full_name', 'email', 'created_at', 'status'], 'created_at', 'desc');

        $perPage = $this->getPerPage($request);
        $paginator = $query->paginate($perPage);

        return ApiResponse::paginated(
            $paginator,
            'Users retrieved successfully.',
            UserListResource::class
        );
    }

    public function assignable(Request $request): JsonResponse
    {
        $this->authorize('user.lookup');

        $query = User::query()->where('status', 'active');

        if ($search = $request->query('search')) {
            $term = str_replace(['%', '_'], ['\\%', '\\_'], $search);
            $query->where('full_name', 'like', "%{$term}%");
        }

        $users = $query->orderBy('full_name')
            ->get(['id', 'full_name', 'department_id'])
            ->load('department:id,name');

        return ApiResponse::success($users, 'Assignable users retrieved.');
    }

    public function show(User $user): JsonResponse
    {
        $this->authorize('user.view', $user);

        return ApiResponse::success(
            new UserAdminResource($user->load(['role', 'department', 'employeeProfile'])),
            'User retrieved successfully.'
        );
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $this->authorize('user.create');

        $data = CreateUserData::fromArray($request->validated());
        $user = $this->userService->create($data, $request->user());

        return ApiResponse::created(
            new UserAdminResource($user),
            'User created successfully.'
        );
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $this->authorize('user.update', $user);

        $data = UpdateUserData::fromArray($request->validated());
        $updatedUser = $this->userService->update($user, $data, $request->user());

        return ApiResponse::success(
            new UserAdminResource($updatedUser),
            'User updated successfully.'
        );
    }

    public function destroy(User $user, Request $request): JsonResponse
    {
        $this->authorize('user.delete', $user);

        $this->userService->delete($user, $request->user());

        return ApiResponse::success(null, 'User deleted successfully.');
    }

    public function activate(User $user, Request $request): JsonResponse
    {
        $this->authorize('user.activate', $user);

        $activatedUser = $this->userService->activate($user, $request->user());

        return ApiResponse::success(
            new UserAdminResource($activatedUser),
            'User activated successfully.'
        );
    }

    public function deactivate(User $user, Request $request): JsonResponse
    {
        $this->authorize('user.deactivate', $user);

        $deactivatedUser = $this->userService->deactivate($user, $request->user());

        return ApiResponse::success(
            new UserAdminResource($deactivatedUser),
            'User deactivated successfully.'
        );
    }

    public function resetPassword(User $user, Request $request): JsonResponse
    {
        $this->authorize('user.reset-password', $user);

        $password = $this->userService->resetPassword($user, $request->user());

        return ApiResponse::success(
            ['temporary_password' => $password],
            'Password reset successfully.'
        );
    }

    public function roles(): JsonResponse
    {
        $this->authorize('user.viewAny');

        $roles = Role::all(['id', 'name']);

        return ApiResponse::success($roles, 'Roles retrieved.');
    }
}
