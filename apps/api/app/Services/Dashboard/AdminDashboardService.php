<?php

namespace App\Services\Dashboard;

use App\Enums\RoleName;
use App\Models\Asset;
use App\Models\AuditLog;
use App\Models\Department;
use App\Models\Role;
use App\Models\User;

class AdminDashboardService
{
    public function __construct(
        protected ManagerDashboardService $managerService,
    ) {}

    public function get(User $actor, DashboardDateRange $range): array
    {
        $managerData = $this->managerService->get($actor, $range);

        return array_merge($managerData, [
            'total_users' => User::query()->count(),
            'total_technicians' => User::query()
                ->where('role_id', Role::where('name', RoleName::Technician->value)->value('id'))
                ->count(),
            'total_departments' => Department::query()->count(),
            'total_assets' => Asset::query()->count(),
            'assets_by_status' => Asset::query()
                ->selectRaw('status, COUNT(*) as count')
                ->groupBy('status')
                ->orderBy('status')
                ->get()
                ->map(fn ($row) => ['status' => $row->status instanceof \BackedEnum ? $row->status->value : (string) $row->status, 'count' => (int) $row->count])
                ->toArray(),
            'recent_system_activity' => AuditLog::query()
                ->with('user:id,full_name')
                ->latest('created_at')
                ->limit(8)
                ->get()
                ->map(fn ($log) => [
                    'id' => $log->id,
                    'user' => $log->user ? ['id' => $log->user->id, 'full_name' => $log->user->full_name] : null,
                    'action' => $log->action,
                    'module' => $log->module,
                    'description' => $log->description,
                    'created_at' => $log->created_at,
                ])
                ->toArray(),
        ]);
    }
}
