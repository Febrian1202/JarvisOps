<?php

namespace App\Http\Controllers\Export;

use App\Http\Controllers\Controller;
use App\Http\Requests\Asset\IndexAssetRequest;
use App\Http\Requests\Audit\IndexAuditLogRequest;
use App\Http\Requests\Ticket\IndexTicketRequest;
use App\Models\Asset;
use App\Services\Export\ExportService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportController extends Controller
{
    public function __construct(
        protected ExportService $exportService,
    ) {}

    public function tickets(IndexTicketRequest $request): StreamedResponse
    {
        return $this->exportService->exportTickets($request->user(), $request->validated());
    }

    public function assets(IndexAssetRequest $request): StreamedResponse
    {
        $this->authorize('viewAny', Asset::class);

        return $this->exportService->exportAssets($request->validated());
    }

    public function auditLogs(IndexAuditLogRequest $request): StreamedResponse
    {
        $this->authorize('audit-log.viewAny');

        return $this->exportService->exportAuditLogs(
            actor: $request->user(),
            filters: $request->validated(),
            dateFrom: $request->getDateFromUtc(),
            dateTo: $request->getDateToUtc(),
            sortBy: $request->query('sort_by', 'created_at'),
            sortDir: $request->query('sort_dir', 'desc'),
        );
    }
}
