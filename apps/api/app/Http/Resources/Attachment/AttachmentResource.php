<?php

namespace App\Http\Resources\Attachment;

use App\Models\TicketAttachment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin TicketAttachment
 */
class AttachmentResource extends JsonResource
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
            'original_filename' => $this->original_filename,
            'mime_type' => $this->mime_type,
            'file_size' => $this->file_size,
            'uploaded_by' => $this->whenLoaded('uploader', fn () => $this->uploader ? [
                'id' => $this->uploader->id,
                'full_name' => $this->uploader->full_name,
            ] : null, $this->uploader ? [
                'id' => $this->uploader->id,
                'full_name' => $this->uploader->full_name,
            ] : null),
            'download_url' => "/api/attachments/{$this->id}/download",
            'created_at' => $this->created_at,
        ];
    }
}
