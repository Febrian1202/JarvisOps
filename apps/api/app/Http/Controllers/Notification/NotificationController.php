<?php

namespace App\Http\Controllers\Notification;

use App\Http\Controllers\Controller;
use App\Http\Requests\Notification\IndexNotificationRequest;
use App\Http\Resources\Notification\NotificationResource;
use App\Models\Notification;
use App\Services\Notification\NotificationQueryService;
use App\Support\ApiResponse;
use App\Support\HandlesPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    use HandlesPagination;

    public function __construct(
        protected NotificationQueryService $queryService
    ) {}

    public function index(IndexNotificationRequest $request): JsonResponse
    {
        $this->authorize('viewAny', Notification::class);

        $perPage = $this->getPerPage($request);
        $sortBy = $request->query('sort_by', 'created_at');
        $sortDir = $request->query('sort_dir', 'desc');

        $paginator = $this->queryService->paginate(
            user: $request->user(),
            filters: $request->validated(),
            perPage: $perPage,
            sortBy: $sortBy,
            sortDir: $sortDir
        );

        return ApiResponse::paginated(
            paginator: $paginator,
            message: 'Notifications retrieved successfully.',
            resource: NotificationResource::class
        );
    }

    public function unreadCount(Request $request): JsonResponse
    {
        $this->authorize('viewAny', Notification::class);

        $count = $this->queryService->getUnreadCount($request->user());

        return ApiResponse::success(
            data: ['unread_count' => $count],
            message: 'Unread notification count retrieved successfully.'
        );
    }

    public function read(Request $request, Notification $notification): JsonResponse
    {
        if ($notification->user_id !== $request->user()->id) {
            abort(404, 'Resource not found.');
        }

        $this->authorize('markAsRead', $notification);

        $this->queryService->markAsRead($notification);

        return ApiResponse::success(
            data: null,
            message: 'Notification marked as read.'
        );
    }

    public function readAll(Request $request): JsonResponse
    {
        $this->authorize('markAllAsRead', Notification::class);

        $this->queryService->markAllAsRead($request->user());

        return ApiResponse::success(
            data: null,
            message: 'All notifications marked as read.'
        );
    }
}
