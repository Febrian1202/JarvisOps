'use client';

import React from 'react';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { apiFetch } from '@/lib/client/api';
import { referenceKeys } from '@/lib/query-keys';
import { useReferenceData } from '@/hooks/use-reference-data';
import type { DialogType } from './use-ticket-actions';
import type { TicketDetail, TicketAction } from '@/types/tickets';
import type { TechnicianOption } from '@/types/auth';

const cancelSchema = z.object({
  note: z.string().min(1, 'Alasan pembatalan wajib diisi.'),
});

const statusSchema = z.object({
  note: z.string().optional(),
});

interface ActionDialogsProps {
  ticket: TicketDetail;
  activeDialog: DialogType;
  activeAction: TicketAction | null;
  onClose: () => void;
  onAssign: (data: { technician_id: number; note?: string }) => void;
  onStatus: (data: { status_id: number; note?: string }) => void;
  onPriority: (data: { priority_id: number }) => void;
  onEdit: (data: Record<string, unknown>) => void;
  onDelete: () => void;
  isDeletePending: boolean;
  isEditPending: boolean;
  isStatusPending: boolean;
  isAssignPending: boolean;
}

export function ActionDialogs({
  ticket,
  activeDialog,
  activeAction,
  onClose,
  onAssign,
  onStatus,
  onPriority,
  onEdit,
  onDelete,
  isDeletePending,
  isEditPending,
  isStatusPending,
  isAssignPending,
}: ActionDialogsProps) {
  const { categories, priorities } = useReferenceData();

  // Query technicians for assign dialog
  const { data: techsResponse } = useQuery({
    queryKey: referenceKeys.technicians(),
    queryFn: () => apiFetch<TechnicianOption[]>('/technicians'),
    enabled: activeDialog === 'assign',
  });
  const technicians = techsResponse?.data ?? [];

  // Cancel form (note required)
  const cancelForm = useForm({
    resolver: zodResolver(cancelSchema),
    defaultValues: { note: '' },
  });
  const cancelNote = useWatch({ control: cancelForm.control, name: 'note' });

  // Assign form (technician_id + optional note)
  const assignForm = useForm({
    defaultValues: { technician_id: undefined as number | undefined, note: '' },
  });

  // Status form (note optional)
  const statusForm = useForm({
    resolver: zodResolver(statusSchema),
    defaultValues: { note: '' },
  });

  // Edit form
  const editForm = useForm({
    defaultValues: {
      title: ticket.title,
      description: ticket.description,
      category_id: ticket.category.id,
    },
  });

  const getStatusId = (action: TicketAction | null): number | undefined => {
    switch (action) {
      case 'start': return 3;
      case 'resolve': return 4;
      case 'close': return 5;
      case 'reopen': return 3;
      default: return undefined;
    }
  };

  const handleStatusSubmit = (data: { note?: string }) => {
    if (activeAction) {
      const statusId = getStatusId(activeAction);
      if (statusId) onStatus({ status_id: statusId, note: data.note });
    }
  };

  return (
    <>
      {/* Assign Dialog */}
      <Dialog open={activeDialog === 'assign'} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Tugaskan Teknisi</DialogTitle>
            <DialogDescription>Pilih teknisi yang akan menangani tiket ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Teknisi <span className="text-destructive">*</span></Label>
              <Controller
                name="technician_id"
                control={assignForm.control}
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(v) => field.onChange(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih teknisi…" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan penugasan…"
                rows={2}
                {...assignForm.register('note')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button disabled={isAssignPending} onClick={() => {
              const techId = assignForm.getValues('technician_id');
              if (techId) onAssign({ technician_id: Number(techId), note: assignForm.getValues('note') });
            }}>
              {isAssignPending ? 'Menugaskan…' : 'Tugaskan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Confirmation Dialog (start/resolve/close/reopen/unassign) */}
      <Dialog open={activeDialog === 'status'} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Konfirmasi Perubahan Status</DialogTitle>
            <DialogDescription>
              {activeAction === 'start' && 'Anda akan mulai mengerjakan tiket ini.'}
              {activeAction === 'resolve' && 'Tandai tiket sebagai selesai.'}
              {activeAction === 'close' && 'Tutup tiket ini.'}
              {activeAction === 'reopen' && 'Buka kembali tiket ini.'}
              {activeAction === 'unassign' && 'Lepaskan penugasan teknisi dari tiket ini.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={statusForm.handleSubmit(handleStatusSubmit)} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Catatan (opsional)</Label>
              <Textarea
                placeholder="Tambahkan catatan perubahan…"
                rows={2}
                {...statusForm.register('note')}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={isStatusPending}>
                {isStatusPending ? 'Memproses…' : 'Konfirmasi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog (note required) */}
      <Dialog open={activeDialog === 'cancel'} onOpenChange={(open) => { if (!open) { onClose(); cancelForm.reset(); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Batalkan Ticket</DialogTitle>
            <DialogDescription>
              Anda akan membatalkan tiket ini. Tindakan ini tidak dapat diurungkan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={cancelForm.handleSubmit((d) => onStatus({ status_id: 5, note: d.note }))} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="cancel-note">Alasan Pembatalan <span className="text-destructive">*</span></Label>
              <Textarea
                id="cancel-note"
                placeholder="Wajib diisi: jelaskan alasan pembatalan…"
                rows={3}
                {...cancelForm.register('note')}
                aria-invalid={!!cancelForm.formState.errors.note}
              />
              {cancelForm.formState.errors.note && (
                <p className="text-xs text-destructive">{cancelForm.formState.errors.note.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Kembali</Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={!cancelNote?.trim() || isStatusPending}
              >
                {isStatusPending ? 'Membatalkan…' : 'Batalkan Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Priority Dialog */}
      <Dialog open={activeDialog === 'priority'} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Prioritas</DialogTitle>
            <DialogDescription>Pilih tingkat prioritas baru untuk tiket ini.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Prioritas Baru</Label>
              <Select
                onValueChange={(v) => onPriority({ priority_id: Number(v) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih prioritas…" />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} ({Math.round(p.sla_minutes / 60)} jam)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Batal</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={activeDialog === 'edit'} onOpenChange={(open) => { if (!open) { onClose(); editForm.reset(); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Tiket</DialogTitle>
            <DialogDescription>Ubah kolom yang tersedia untuk diedit.</DialogDescription>
          </DialogHeader>
          <form onSubmit={editForm.handleSubmit((d) => {
            if (ticket.editable_fields.includes('title') || ticket.editable_fields.includes('description') || ticket.editable_fields.includes('category_id')) {
              const payload: Record<string, unknown> = {};
              if (ticket.editable_fields.includes('title')) payload.title = d.title;
              if (ticket.editable_fields.includes('description')) payload.description = d.description;
              if (ticket.editable_fields.includes('category_id')) payload.category_id = d.category_id;
              onEdit(payload);
            }
          })} className="space-y-4 py-2">
            {ticket.editable_fields.includes('title') && (
              <div className="space-y-1.5">
                <Label>Judul</Label>
                <Input {...editForm.register('title')} />
              </div>
            )}
            {ticket.editable_fields.includes('description') && (
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea rows={3} {...editForm.register('description')} />
              </div>
            )}
            {ticket.editable_fields.includes('category_id') && (
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  {...editForm.register('category_id', { valueAsNumber: true })}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>Batal</Button>
              <Button type="submit" disabled={isEditPending}>
                {isEditPending ? 'Menyimpan…' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={activeDialog === 'delete'}
        onOpenChange={(open) => { if (!open) onClose(); }}
        title="Hapus Tiket"
        description="Apakah Anda yakin ingin menghapus tiket ini? Tindakan ini tidak dapat diurungkan."
        confirmText="Hapus Tiket"
        variant="destructive"
        isLoading={isDeletePending}
        onConfirm={onDelete}
      />
    </>
  );
}