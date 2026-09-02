<?php

namespace App\Http\Controllers\Asset;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetHistoryController extends Controller
{
    public function __invoke(Request $request, Asset $asset): JsonResponse
    {
        $this->authorize('viewHistory', $asset);

        $assignments = $asset->assignments()->with('user')->get()
            ->flatMap(function ($a) {
                $events = [];

                $events[] = [
                    'type' => 'assignment',
                    'action' => 'assigned',
                    'user' => $a->user ? [
                        'id' => $a->user->id,
                        'full_name' => $a->user->full_name,
                    ] : null,
                    'notes' => $a->notes,
                    'occurred_at' => $a->assigned_at?->toISOString(),
                ];

                if ($a->released_at) {
                    $events[] = [
                        'type' => 'assignment',
                        'action' => 'released',
                        'user' => $a->user ? [
                            'id' => $a->user->id,
                            'full_name' => $a->user->full_name,
                        ] : null,
                        'notes' => $a->notes,
                        'occurred_at' => $a->released_at?->toISOString(),
                    ];
                }

                return $events;
            });

        $histories = $asset->histories()->get()->map(fn ($h) => [
            'type' => 'history',
            'action' => $h->action,
            'description' => $h->description,
            'user' => null,
            'notes' => null,
            'occurred_at' => ($h->action_at ?? $h->created_at)?->toISOString(),
        ]);

        $timeline = $assignments->concat($histories)
            ->sortBy('occurred_at')
            ->values();

        return ApiResponse::success($timeline, 'Asset history retrieved successfully.');
    }
}
