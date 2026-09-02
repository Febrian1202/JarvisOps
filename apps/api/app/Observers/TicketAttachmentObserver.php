<?php

namespace App\Observers;

use App\Models\TicketAttachment;
use Illuminate\Support\Facades\Storage;

class TicketAttachmentObserver
{
    public bool $afterCommit = true;

    public function deleted(TicketAttachment $attachment): void
    {
        if ($attachment->storage_path && Storage::disk('private')->exists($attachment->storage_path)) {
            Storage::disk('private')->delete($attachment->storage_path);
        }
    }
}
