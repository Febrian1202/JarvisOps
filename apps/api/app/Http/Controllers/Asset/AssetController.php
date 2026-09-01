<?php

namespace App\Http\Controllers\Asset;

use App\Enums\AssetStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\Asset\AssignableAssetResource;
use App\Models\Asset;
use App\Models\AssetAssignment;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
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
