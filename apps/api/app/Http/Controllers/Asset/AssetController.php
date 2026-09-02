<?php

namespace App\Http\Controllers\Asset;

use App\DTOs\Asset\AssignAssetData;
use App\DTOs\Asset\CreateAssetData;
use App\DTOs\Asset\ReleaseAssetData;
use App\DTOs\Asset\UpdateAssetData;
use App\Enums\AssetStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Asset\AssignAssetRequest;
use App\Http\Requests\Asset\IndexAssetRequest;
use App\Http\Requests\Asset\ReleaseAssetRequest;
use App\Http\Requests\Asset\StoreAssetRequest;
use App\Http\Requests\Asset\UpdateAssetRequest;
use App\Http\Resources\Asset\AssetListResource;
use App\Http\Resources\Asset\AssetResource;
use App\Http\Resources\Asset\AssignableAssetResource;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Services\Asset\AssetAssignmentService;
use App\Services\Asset\AssetQueryService;
use App\Services\Asset\AssetService;
use App\Support\ApiResponse;
use App\Support\HandlesPagination;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    use HandlesPagination;

    public function index(IndexAssetRequest $request, AssetQueryService $queryService): JsonResponse
    {
        $this->authorize('viewAny', Asset::class);

        $paginator = $queryService->paginate($request);

        return ApiResponse::paginated($paginator, 'Assets retrieved successfully.', AssetListResource::class);
    }

    public function show(Asset $asset): JsonResponse
    {
        $this->authorize('view', $asset);

        $asset->load(['activeAssignment.user']);

        return ApiResponse::success(new AssetResource($asset), 'Asset details retrieved successfully.');
    }

    public function store(StoreAssetRequest $request, AssetService $assetService): JsonResponse
    {
        $this->authorize('create', Asset::class);

        $dto = CreateAssetData::fromArray($request->validated());
        $asset = $assetService->create($dto, $request->user());

        return ApiResponse::created(new AssetListResource($asset), 'Asset created successfully.');
    }

    public function update(UpdateAssetRequest $request, Asset $asset, AssetService $assetService): JsonResponse
    {
        $this->authorize('update', $asset);

        $oldData = $asset->only([
            'asset_tag', 'name', 'category', 'brand', 'model', 'serial_number', 'purchase_date', 'status', 'notes',
        ]);
        $dto = UpdateAssetData::fromArray($request->validated(), $oldData);
        $updated = $assetService->update($asset, $dto, $request->user());

        return ApiResponse::success(new AssetListResource($updated), 'Asset updated successfully.');
    }

    public function destroy(Request $request, Asset $asset, AssetService $assetService): JsonResponse
    {
        $this->authorize('delete', $asset);

        $assetService->delete($asset, $request->user());

        return ApiResponse::success(null, 'Asset deleted successfully.');
    }

    public function assign(AssignAssetRequest $request, Asset $asset, AssetAssignmentService $assignmentService): JsonResponse
    {
        $this->authorize('assign', $asset);

        $dto = AssignAssetData::fromArray($request->validated());
        $assigned = $assignmentService->assign($asset, $dto, $request->user());

        return ApiResponse::success(new AssetListResource($assigned), 'Asset assigned successfully.');
    }

    public function release(ReleaseAssetRequest $request, Asset $asset, AssetAssignmentService $assignmentService): JsonResponse
    {
        $this->authorize('release', $asset);

        $dto = ReleaseAssetData::fromArray($request->validated());
        $released = $assignmentService->release($asset, $dto, $request->user());

        return ApiResponse::success(new AssetListResource($released), 'Asset released successfully.');
    }

    public function myAssets(Request $request): JsonResponse
    {
        $this->authorize('viewOwn', Asset::class);

        $paginator = Asset::query()
            ->with(['activeAssignment.user'])
            ->whereHas('activeAssignment', fn ($q) => $q->where('user_id', $request->user()->id))
            ->orderBy('created_at', 'desc')
            ->paginate($this->getPerPage($request));

        return ApiResponse::paginated($paginator, 'My assets retrieved successfully.', AssetListResource::class);
    }

    public function assignable(Request $request): JsonResponse
    {
        $this->authorize('viewAssignable', Asset::class);

        $assets = Asset::whereIn('id', AssetAssignment::where('user_id', $request->user()->id)
            ->whereNull('released_at')
            ->pluck('asset_id'))
            ->whereIn('status', [AssetStatus::Available, AssetStatus::Assigned])
            ->get();

        return ApiResponse::success(AssignableAssetResource::collection($assets), 'Assignable assets retrieved.');
    }
}
