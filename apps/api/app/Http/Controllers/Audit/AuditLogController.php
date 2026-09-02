<?php

namespace App\Http\Controllers\Audit;

use App\Http\Controllers\Controller;
use App\Http\Requests\Audit\IndexAuditLogRequest;
use App\Http\Resources\Audit\AuditLogDetailResource;
use App\Http\Resources\Audit\AuditLogListResource;
use App\Models\AuditLog;
use App\Services\Audit\AuditLogQueryService;
use App\Support\ApiResponse;
use App\Support\HandlesPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AuditLogController extends Controller
{
    use HandlesPagination;

    public function __construct(
        protected AuditLogQueryService $queryService
    ) {}

    public function index(IndexAuditLogRequest $request): JsonResponse
    {
        $this->authorize('audit-log.viewAny');

        $perPage = $this->getPerPage($request);
        $sortBy = $request->query('sort_by', 'created_at');
        $sortDir = $request->query('sort_dir', 'desc');

        $paginator = $this->queryService->paginate(
            actor: $request->user(),
            filters: $request->validated(),
            dateFrom: $request->getDateFromUtc(),
            dateTo: $request->getDateToUtc(),
            perPage: $perPage,
            sortBy: $sortBy,
            sortDir: $sortDir
        );

        return ApiResponse::paginated(
            paginator: $paginator,
            message: 'Audit logs retrieved successfully.',
            resource: AuditLogListResource::class
        );
    }

    public function show(Request $request, AuditLog $auditLog): JsonResponse
    {
        $this->authorize('audit-log.view');

        if (! $this->queryService->isVisibleTo($auditLog, $request->user())) {
            abort(404, 'Resource not found.');
        }

        return ApiResponse::success(
            data: new AuditLogDetailResource($auditLog->load('user')),
            message: 'Audit log retrieved successfully.'
        );
    }
}
