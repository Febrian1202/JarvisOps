<?php

namespace App\Services\Asset;

use App\Models\Asset;
use App\Support\HandlesPagination;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\Request;

class AssetQueryService
{
    use HandlesPagination;

    public function paginate(Request $request): LengthAwarePaginator
    {
        $query = Asset::query()
            ->with(['activeAssignment.user']);

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

        return $this->applySorting($query, $request, [
            'asset_tag', 'name', 'status', 'purchase_date', 'created_at',
        ])->paginate($this->getPerPage($request));
    }
}
