<?php

namespace App\Services\Export;

use App\Enums\RoleName;
use App\Models\Asset;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Models\User;
use App\Services\Audit\AuditLogQueryService;
use App\Services\Sla\SlaService;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportService
{
    public function __construct(
        protected CsvExporter $exporter,
        protected SlaService $slaService,
    ) {}

    /**
     * Export tickets dataset based on active filters and role permissions.
     *
     * @param  array<string, mixed>  $filters
     */
    public function exportTickets(User $actor, array $filters): StreamedResponse
    {
        if ($actor->hasRole(RoleName::Employee)) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor tiket.');
        }

        $query = Ticket::with(['status', 'priority', 'category', 'reporter', 'technician']);

        if (! empty($filters['search'])) {
            $search = str_replace(['%', '_'], ['\\%', '\\_'], (string) $filters['search']);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('ticket_number LIKE ? ESCAPE ?', ["%{$search}%", '\\'])
                    ->orWhereRaw('title LIKE ? ESCAPE ?', ["%{$search}%", '\\']);
            });
        }

        foreach (['status_id', 'priority_id', 'category_id'] as $field) {
            if (! empty($filters[$field])) {
                $ids = array_map('intval', explode(',', (string) $filters[$field]));
                $ids = array_values(array_filter($ids, fn ($v) => $v > 0));
                $query->whereIn($field, $ids);
            }
        }

        if (! empty($filters['technician_id'])) {
            if ($filters['technician_id'] === 'unassigned') {
                $query->whereNull('technician_id');
            } else {
                $query->whereIn('technician_id', [(int) $filters['technician_id']]);
            }
        }

        if (! empty($filters['reporter_id'])) {
            $query->where('reporter_id', (int) $filters['reporter_id']);
        }

        foreach (['department_id', 'asset_id'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, (int) $filters[$field]);
            }
        }

        if (! empty($filters['sla_status'])) {
            if ($filters['sla_status'] === 'breached') {
                $this->slaService->scopeBreached($query);
            } else {
                $this->slaService->scopeOnTrack($query);
            }
        }

        if (! empty($filters['created_from'])) {
            $query->where('created_at', '>=', $filters['created_from'].' 00:00:00');
        }

        if (! empty($filters['created_to'])) {
            $query->where('created_at', '<=', $filters['created_to'].' 23:59:59');
        }

        $sortBy = $filters['sort_by'] ?? 'created_at';
        $sortDir = $filters['sort_dir'] ?? 'desc';
        $query->orderBy($sortBy, $sortDir);

        $headers = [
            'ticket_number',
            'title',
            'status',
            'priority',
            'category',
            'reporter',
            'technician',
            'sla_deadline',
            'sla_status',
            'created_at',
            'resolved_at',
        ];

        $generator = function () use ($query) {
            foreach ($query->cursor() as $ticket) {
                yield [
                    $ticket->ticket_number,
                    $ticket->title,
                    $ticket->status?->name,
                    $ticket->priority?->name,
                    $ticket->category?->name,
                    $ticket->reporter?->full_name,
                    $ticket->technician?->full_name,
                    $ticket->sla_deadline?->toISOString(),
                    $this->slaService->isBreached($ticket) ? 'breached' : 'on_track',
                    $ticket->created_at?->toISOString(),
                    $ticket->resolved_at?->toISOString(),
                ];
            }
        };

        $filename = sprintf('tickets-export-%s.csv', now()->format('Ymd'));

        return $this->exporter->stream($filename, $headers, $generator());
    }

    /**
     * Export assets dataset based on active filters.
     *
     * @param  array<string, mixed>  $filters
     */
    public function exportAssets(array $filters): StreamedResponse
    {
        $query = Asset::query()->with(['activeAssignment.user']);

        if (! empty($filters['search'])) {
            $term = str_replace(['%', '_'], ['\\%', '\\_'], (string) $filters['search']);
            $query->where(function ($q) use ($term) {
                $q->where('asset_tag', 'LIKE', "%{$term}%")
                    ->orWhere('serial_number', 'LIKE', "%{$term}%")
                    ->orWhere('name', 'LIKE', "%{$term}%");
            });
        }

        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (! empty($filters['category'])) {
            $query->where('category', $filters['category']);
        }

        if (! empty($filters['assigned_user_id'])) {
            $assignedUserId = $filters['assigned_user_id'];
            $query->whereHas('activeAssignment', function ($q) use ($assignedUserId) {
                $q->where('user_id', $assignedUserId);
            });
        }

        $sortBy = $filters['sort_by'] ?? 'asset_tag';
        $sortDir = $filters['sort_dir'] ?? 'asc';
        $query->orderBy($sortBy, $sortDir);

        $headers = [
            'asset_tag',
            'name',
            'category',
            'brand',
            'model',
            'serial_number',
            'status',
            'assigned_to',
            'purchase_date',
            'created_at',
        ];

        $generator = function () use ($query) {
            foreach ($query->cursor() as $asset) {
                yield [
                    $asset->asset_tag,
                    $asset->name,
                    $asset->category,
                    $asset->brand,
                    $asset->model,
                    $asset->serial_number,
                    $asset->status?->value ?? (string) $asset->status,
                    $asset->activeAssignment?->user?->full_name,
                    $asset->purchase_date?->format('Y-m-d'),
                    $asset->created_at?->toISOString(),
                ];
            }
        };

        $filename = sprintf('assets-export-%s.csv', now()->format('Ymd'));

        return $this->exporter->stream($filename, $headers, $generator());
    }

    /**
     * Export audit logs dataset respecting actor role scoping and active filters.
     *
     * @param  array<string, mixed>  $filters
     */
    public function exportAuditLogs(
        User $actor,
        array $filters,
        ?Carbon $dateFrom = null,
        ?Carbon $dateTo = null,
        string $sortBy = 'created_at',
        string $sortDir = 'desc'
    ): StreamedResponse {
        $query = AuditLog::query()->with('user');

        if (! $actor->isAdmin()) {
            if ($actor->hasRole(RoleName::Manager)) {
                $query->whereIn('module', AuditLogQueryService::MANAGER_ALLOWED_MODULES);
            } else {
                abort(403, 'Aksi ini tidak diizinkan.');
            }
        }

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

        $query->orderBy($sortBy, $sortDir);

        $headers = [
            'id',
            'created_at',
            'user',
            'action',
            'module',
            'module_id',
            'ip_address',
            'description',
        ];

        $generator = function () use ($query) {
            foreach ($query->cursor() as $log) {
                yield [
                    $log->id,
                    $log->created_at?->toISOString(),
                    $log->user?->full_name,
                    $log->action,
                    $log->module,
                    $log->module_id,
                    $log->ip_address,
                    $log->description,
                ];
            }
        };

        $filename = sprintf('audit-logs-export-%s.csv', now()->format('Ymd'));

        return $this->exporter->stream($filename, $headers, $generator());
    }
}
