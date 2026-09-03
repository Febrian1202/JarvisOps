'use client';

import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Paperclip, UploadCloud } from 'lucide-react';
import { useUploadWithProgress } from '@/hooks/useUploadWithProgress';
import { useApiMutation } from '@/hooks/useApiMutation';
import { apiFetch } from '@/lib/client/api';
import { ticketKeys } from '@/lib/query-keys';
import { AttachmentCard } from './AttachmentCard';
import { useAuth } from '@/components/providers/auth-provider';
import type { TicketAttachment } from '@/types/tickets';

interface AttachmentListProps {
  ticketId: number;
  canUpload: boolean;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

export function AttachmentList({ ticketId, canUpload }: AttachmentListProps) {
  const { user, can } = useAuth();
  const queryClient = useQueryClient();
  const attachmentsKey = ticketKeys.attachments(ticketId);
  const detailKey = ticketKeys.detail(ticketId);

  const { data, isLoading } = useQuery({
    queryKey: attachmentsKey,
    queryFn: () => apiFetch<TicketAttachment[]>(`/tickets/${ticketId}/attachments`),
  });
  const attachments = data?.data ?? [];

  const { upload, isUploading, progress } = useUploadWithProgress<TicketAttachment>({
    url: `/tickets/${ticketId}/attachments`,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: attachmentsKey });
      void queryClient.invalidateQueries({ queryKey: detailKey });
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`/attachments/${id}`, { method: 'DELETE' }),
    onSuccessMessage: 'Lampiran berhasil dihapus.',
    invalidateKeys: [attachmentsKey, detailKey],
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      alert('Format berkas harus JPG, PNG, atau PDF.');
      return;
    }
    if (file.size > MAX_SIZE) {
      alert('Ukuran berkas melebihi batas maksimal 5 MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    void upload(formData).catch(() => {});
  };

  const canDelete = (attachment: TicketAttachment): boolean => {
    return can('attachment.delete') || attachment.uploaded_by?.id === user?.id;
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {attachments.length === 0 && !canUpload ? (
        <p className="text-xs text-muted-foreground">Belum ada lampiran.</p>
      ) : (
        <div className="space-y-2">
          {attachments.map((a) => (
            <AttachmentCard
              key={a.id}
              attachment={a}
              canDelete={canDelete(a)}
              onDelete={(id) => deleteMutation.mutate(id)}
            />
          ))}
        </div>
      )}

      {canUpload && (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center transition-colors hover:bg-muted/40">
          <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={handleFileSelect} disabled={isUploading} />
          <UploadCloud className="h-5 w-5 text-muted-foreground" />
          <p className="text-xs font-medium text-foreground">
            {isUploading ? `Mengunggah… ${progress}%` : 'Unggah lampiran'}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Maksimal 5 MB (JPG, PNG, PDF)
          </p>
        </label>
      )}
    </div>
  );
}

export function AttachmentSectionTitle({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-2">
      <Paperclip className="h-4 w-4 text-primary" />
      <h2 className="text-sm font-semibold text-foreground">Lampiran</h2>
      {count > 0 && (
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {count}
        </span>
      )}
    </div>
  );
}