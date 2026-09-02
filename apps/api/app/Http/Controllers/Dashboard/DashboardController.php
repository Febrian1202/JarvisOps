<?php

namespace App\Http\Controllers\Dashboard;

use App\Exceptions\PendingDashboardException;
use App\Http\Controllers\Controller;
use App\Http\Requests\Dashboard\IndexDashboardRequest;
use App\Services\Dashboard\DashboardDateRange;
use App\Services\Dashboard\EmployeeDashboardService;
use App\Services\Dashboard\ManagerDashboardService;
use App\Services\Dashboard\TechnicianDashboardService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(
        protected EmployeeDashboardService $employeeService,
        protected TechnicianDashboardService $technicianService,
        protected ManagerDashboardService $managerService,
    ) {}

    public function employee(IndexDashboardRequest $request): JsonResponse
    {
        $this->authorize('dashboard.employee');
        $data = $this->employeeService->get($request->user());

        return ApiResponse::success($data, 'Employee dashboard retrieved successfully.');
    }

    public function technician(IndexDashboardRequest $request): JsonResponse
    {
        $this->authorize('dashboard.technician');
        $data = $this->technicianService->get($request->user());

        return ApiResponse::success($data, 'Technician dashboard retrieved successfully.');
    }

    public function manager(IndexDashboardRequest $request): JsonResponse
    {
        $this->authorize('dashboard.manager');

        $range = DashboardDateRange::fromDates($request->query('date_from'), $request->query('date_to'));
        $data = $this->managerService->get($request->user(), $range);

        return ApiResponse::success($data, 'Manager dashboard retrieved successfully.');
    }

    public function admin(IndexDashboardRequest $request): JsonResponse
    {
        $this->authorize('dashboard.admin');

        throw new PendingDashboardException;
    }
}
