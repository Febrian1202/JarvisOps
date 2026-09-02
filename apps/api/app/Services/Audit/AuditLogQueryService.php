<?php

namespace App\Services\Audit;

use App\Enums\RoleName;
use App\Models\AuditLog;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;

class AuditLogQueryService
{
    public const MANAGER_ALLOWED_MODULES = [
        'ticket',
        'asset',
        'article',
    ];

    /**
     * @param  array<string, mixed>  $filters
     */
    public function paginate(
        User $actor,
        array $filters = [],
        ?Carbon $dateFrom = null,
        ?Carbon $dateTo = null,
        int $perPage = 10,
        string $sortBy = 'created_at',
        string $sortDir = 'desc'
    ): LengthAwarePaginator {
        $query = AuditLog::query()->with('user');

        // 1. Server-side Scoping based on role
        $this->applyRoleScope($query, $actor);

        // 2. Client filters applied after server scoping
        if (! empty($filters['user_id'])) {
            $query->where('user_id', $filters['user_id']);
        }

        if (! empty($filters['module'])) {
            $query->where('module', $filters['module']);
        }

        if (! empty($filters['action'])) {
            $query->where('action', $filters['action']);
        }

        if (! empty($filters['module_id'])) {
            $query->where('module_id', $filters['module_id']);
        }

        if ($dateFrom !== null) {
            $query->where('created_at', '>=', $dateFrom);
        }

        if ($dateTo !== null) {
            $query->where('created_at', '<=', $dateTo);
        }

        return $query->orderBy($sortBy, $sortDir)->paginate($perPage);
    }

    public function isVisibleTo(AuditLog $auditLog, User $actor): bool
    {
        if ($actor->isAdmin()) {
            return true;
        }

        if ($actor->hasRole(RoleName::Manager)) {
            return in_array($auditLog->module, self::MANAGER_ALLOWED_MODULES, true);
        }

        return false;
    }

    protected function applyRoleScope(Builder $query, User $actor): void
    {
        if ($actor->isAdmin()) {
            return; // Full access
        }

        if ($actor->hasRole(RoleName::Manager)) {
            $query->whereIn('module', self::MANAGER_ALLOWED_MODULES);

            return;
        }

        // Roles other than Admin/Manager cannot view any audit log
        $query->whereRaw('1 = 0');
    }
}
