<?php

namespace App\Http\Resources\Ticket;

use App\Services\Sla\SlaService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $sla = app(SlaService::class);

        $asset = $this->whenLoaded('asset', function () {
            $data = [
                'id' => $this->asset->id,
                'asset_tag' => $this->asset->asset_tag,
                'name' => $this->asset->name,
            ];
            if ($this->asset->trashed()) {
                $data['deleted'] = true;
            }

            return $data;
        });

        return [
            'id' => $this->id,
            'ticket_number' => $this->ticket_number,
            'title' => $this->title,
            'description' => $this->description,
            'status' => $this->whenLoaded('status', fn () => $this->status->only('id', 'name')),
            'priority' => $this->whenLoaded('priority', fn () => $this->priority->only('id', 'name', 'sla_minutes')),
            'category' => $this->whenLoaded('category', fn () => $this->category->only('id', 'name')),
            'reporter' => $this->whenLoaded('reporter', fn () => [
                'id' => $this->reporter->id,
                'full_name' => $this->reporter->full_name,
                'department' => $this->reporter->department?->name,
            ]),
            'technician' => $this->whenLoaded('technician', fn () => $this->technician->only('id', 'full_name')),
            'department' => $this->whenLoaded('department', fn () => $this->department->only('id', 'name')),
            'asset' => $asset,
            'sla_duration_minutes' => $this->sla_duration_minutes,
            'sla_deadline' => $this->sla_deadline,
            'sla_breached' => $this->sla_breached,
            'sla_status' => $sla->isBreached($this->resource) ? 'breached' : 'on_track',
            'sla_remaining_minutes' => $sla->remainingMinutes($this->resource),
            'resolved_at' => $this->resolved_at,
            'closed_at' => $this->closed_at,
            'comments_count' => $this->whenLoaded('comments', fn () => $this->comments->count()),
            'attachments_count' => $this->whenLoaded('attachments', fn () => $this->attachments->count()),
            'available_actions' => $this->available_actions ?? [],
            'editable_fields' => $this->editable_fields ?? [],
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
