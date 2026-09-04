'use client';

import React from 'react';
import { FileText, Download, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/shared/relative-time';
import { attachmentDownloadUrl, formatFileSize } from '@/lib/attachments';
import type { TicketAttachment } from '@/types/tickets';

interface AttachmentCardProps {
  attachment: TicketAttachment;
  canDelete: boolean;
  onDelete: (id: number) => void;
}

export function AttachmentCard({ attachment, canDelete, onDelete }: AttachmentCardProps) {
  const downloadUrl = attachmentDownloadUrl(attachment.download_url);

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
      <FileText className="h-5 w-5 shrink-0 text-primary" />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-foreground truncate max-w-50">
          {attachment.original_filename}
        </p>
        <p className="text-[11px] text-muted-foreground">
          {formatFileSize(attachment.file_size)} — {attachment.uploaded_by?.full_name ?? '—'}
        </p>
        <RelativeTime date={attachment.created_at} className="text-[11px] text-muted-foreground" />
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <a
          href={downloadUrl}
          download
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Unduh lampiran"
        >
          <Download className="h-3.5 w-3.5" />
        </a>

        {canDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={() => onDelete(attachment.id)}
            aria-label="Hapus lampiran"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}