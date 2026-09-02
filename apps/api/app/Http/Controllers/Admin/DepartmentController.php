<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AuditAction;
use App\Enums\AuditModule;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreDepartmentRequest;
use App\Http\Requests\Admin\UpdateDepartmentRequest;
use App\Models\Department;
use App\Models\User;
use App\Services\Admin\ReferentialIntegrityGuard;
use App\Services\Audit\AuditLogger;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function __construct(
        protected AuditLogger $auditLogger,
        protected ReferentialIntegrityGuard $guard,
    ) {}

    public function index(): JsonResponse
    {
        $this->authorize('department.viewAny');

        $departments = Department::orderBy('name')->get();

        return ApiResponse::success($departments, 'Departments retrieved.');
    }

    public function show(Department $department): JsonResponse
    {
        $this->authorize('department.viewAny');

        return ApiResponse::success($department, 'Department retrieved.');
    }

    public function store(StoreDepartmentRequest $request): JsonResponse
    {
        $this->authorize('department.manage');

        $dept = Department::create($request->validated());

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Create,
            AuditModule::Department,
            $dept->id,
            "Departemen {$dept->name} dibuat.",
            null,
            $dept->only(['name', 'description'])
        );

        return ApiResponse::created($dept, 'Department created successfully.');
    }

    public function update(UpdateDepartmentRequest $request, Department $department): JsonResponse
    {
        $this->authorize('department.manage');

        $old = $department->only(['name', 'description']);
        $department->update($request->validated());

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Update,
            AuditModule::Department,
            $department->id,
            "Departemen {$department->name} diperbarui.",
            $old,
            $department->only(['name', 'description'])
        );

        return ApiResponse::success($department->fresh(), 'Department updated successfully.');
    }

    public function destroy(Department $department, Request $request): JsonResponse
    {
        $this->authorize('department.manage');

        $this->guard->assertUnreferenced([
            'Departemen' => User::where('department_id', $department->id),
        ]);

        $deptName = $department->name;
        $deptId = $department->id;

        $department->delete();

        $this->auditLogger->log(
            $request->user(),
            AuditAction::Delete,
            AuditModule::Department,
            $deptId,
            "Departemen {$deptName} dihapus."
        );

        return ApiResponse::success(null, 'Department deleted successfully.');
    }
}
