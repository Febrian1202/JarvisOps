<?php

namespace App\Http\Resources\Asset;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssetListResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'asset_tag' => $this->asset_tag,
            'name' => $this->name,
            'category' => $this->category,
            'brand' => $this->brand,
            'model' => $this->model,
            'serial_number' => $this->serial_number,
            'status' => $this->status?->value,
            'purchase_date' => $this->purchase_date?->format('Y-m-d'),
            'current_assignment' => $this->whenLoaded('activeAssignment', function () {
                if (! $this->activeAssignment || ! $this->activeAssignment->user) {
                    return null;
                }

                return [
                    'id' => $this->activeAssignment->id,
                    'user_id' => $this->activeAssignment->user->id,
                    'full_name' => $this->activeAssignment->user->full_name,
                    'assigned_at' => $this->activeAssignment->assigned_at?->toISOString(),
                ];
            }),
            'created_at' => $this->created_at?->toISOString(),
            'updated_at' => $this->updated_at?->toISOString(),
        ];
    }
}
