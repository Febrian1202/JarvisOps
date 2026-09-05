<?php

namespace App\Http\Controllers\Export;

use App\Enums\RoleName;
use App\Http\Controllers\Controller;
use App\Http\Requests\Asset\IndexAssetRequest;
use App\Http\Requests\Audit\IndexAuditLogRequest;
use App\Http\Requests\Ticket\IndexTicketRequest;
use App\Models\Asset;
use App\Models\AuditLog;
use App\Models\Ticket;
use App\Services\Asset\AssetQueryService;
use App\Services\Audit\AuditLogQueryService;
use App\Services\Export\CsvExporter;
use App\Services\Sla\SlaService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function __construct(
        protected CsvExporter $exporter,
        protected SlaService $slaService,
    ) {}

    public function tickets(IndexTicketRequest $request): StreamedResponse
    {
        $actor = $request->user();

        // Strict: Employee cannot export global tickets
        if ($actor->hasRole(RoleName::Employee)) {
            abort(403, 'Anda tidak memiliki hak akses untuk mengekspor tiket.');
        }

        $query = Ticket::with(['status', 'priority', 'category', 'reporter', 'technician']);

        $validated = $request->validated();

        if (! empty($validated['search'])) {
            $search = str_replace(['%', '_'], ['\\%', '\\_'], $validated['search']);
            $query->where(function ($q) use ($search) {
                $q->whereRaw('ticket_number LIKE ? ESCAPE ?', ["%{$search}%", '\\'])
                    ->orWhereRaw('title LIKE ? ESCAPE ?', ["%{$search}%", '\\']);
            });
        }

        foreach (['status_id', 'priority_id', 'category_id'] as $field) {
            if (! empty($validated[$field])) {
                $ids = array_map('intval', explode(',', $validated[$field]));
                $ids = array_values(array_filter($ids, fn ($v) => $v > 0));
                $query->whereIn($field, $ids);
            }
        }

        if (! empty($validated['technician_id'])) {
            if ($validated['technician_id'] === 'unassigned') {
                $query->whereNull('technician_id');
            } else {
                $query->whereIn('technician_id', [(int) $validated['technician_id']]);
            }
        }

        if (! empty($validated['reporter_id'])) {
            $query->where('reporter_id', (int) $validated['reporter_id']);
        }

        foreach (['department_id', 'asset_id'] as $field) {
            if (! empty($validated[$field])) {
                $query->where($field, (int) $validated[$field]);
            }
        }

        if (! empty($validated['sla_status'])) {
            if ($validated['sla_status'] === 'breached') {
                $this->slaService->scopeBreached($query);
            } else {
                $this->slaService->scopeOnTrack($query);
            }
        }

        if (! empty($validated['created_from'])) {
            $query->where('created_at', '>=', $validated['created_from'].' 00:00:00');
        }

        if (! empty($validated['created_to'])) {
            $query->where('created_at', '<=', $validated['created_to'].' 23:59:59');
        }

        $sortBy = $validated['sort_by'] ?? 'created_at';
        $sortDir = $validated['sort_dir'] ?? 'desc';
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

    public function assets(IndexAssetRequest $request, AssetQueryService $queryService): StreamedResponse
    {
        $this->authorize('viewAny', Asset::class);

        $query = Asset::query()->with(['activeAssignment.user']);

        if ($search = $request->query('search')) {
            $term = str_replace(['%', '_'], ['\\%', '\\_'], (string) $search);
            $query->where(function ($q) use ($term) {
                $q->where('asset_tag', 'LIKE', "%{$term}%")
                    ->orWhere('serial_number', 'LIKE', "%{$term}%")
                    ->orWhere('name', 'LIKE', "%{$term}%");
            });
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($category = $request->query('category')) {
            $query->where('category', $category);
        }

        if ($assignedUserId = $request->query('assigned_user_id')) {
            $query->whereHas('activeAssignment', function ($q) use ($assignedUserId) {
                $q->where('user_id', $assignedUserId);
            });
        }

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

    public function auditLogs(IndexAuditLogRequest $request, AuditLogQueryService $queryService): StreamedResponse
    {
        $this->authorize('audit-log.viewAny');

        $actor = $request->user();
        $query = AuditLog::query()->with('user');

        if (! $actor->isAdmin()) {
            if ($actor->hasRole(RoleName::Manager)) {
                $query->whereIn('module', AuditLogQueryService::MANAGER_ALLOWED_MODULES);
            } else {
                abort(403, 'Aksi ini tidak diizinkan.');
            }
        }

        $filters = $request->validated();

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

        $dateFrom = $request->getDateFromUtc();
        if ($dateFrom !== null) {
            $query->where('created_at', '>=', $dateFrom);
        }

        $dateTo = $request->getDateToUtc();
        if ($dateTo !== null) {
            $query->where('created_at', '<=', $dateTo);
        }

        $sortBy = $request->query('sort_by', 'created_at');
        $sortDir = $request->query('sort_dir', 'desc');
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
