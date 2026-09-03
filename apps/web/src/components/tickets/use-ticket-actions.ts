'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { UseMutationResult } from '@tanstack/react-query';
import { useApiMutation } from '@/hooks/useApiMutation';
import { apiFetch } from '@/lib/client/api';
import { ticketKeys } from '@/lib/query-keys';
import type { TicketDetail, TicketAction } from '@/types/tickets';
import type { ApiResponse } from '@/types/api';

export type DialogType = 'assign' | 'status' | 'cancel' | 'priority' | 'edit' | 'delete' | null;

export interface UseTicketActionsReturn {
  activeDialog: DialogType;
  activeAction: TicketAction | null;
  openDialog: (action: TicketAction) => void;
  closeDialog: () => void;
  assignAction: UseMutationResult<ApiResponse<TicketDetail>, unknown, { technician_id: number; note?: string }>;
  statusAction: UseMutationResult<ApiResponse<TicketDetail>, unknown, { status_id: number; note?: string }>;
  priorityAction: UseMutationResult<ApiResponse<TicketDetail>, unknown, { priority_id: number }>;
  editAction: UseMutationResult<ApiResponse<TicketDetail>, unknown, Record<string, unknown>>;
  deleteAction: UseMutationResult<ApiResponse<void>, unknown, void>;
}

export function useTicketActions(ticket: TicketDetail): UseTicketActionsReturn {
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [activeAction, setActiveAction] = useState<TicketAction | null>(null);

  const detailKey = ticketKeys.detail(ticket.id);

  const assignAction = useApiMutation({
    mutationFn: (data: { technician_id: number; note?: string }) =>
      apiFetch<TicketDetail>(`/tickets/${ticket.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ ...data, expected_status_id: ticket.status.id }),
      }),
    onSuccessMessage: 'Ticket berhasil ditugaskan.',
    invalidateKeys: [detailKey, ticketKeys.lists()],
    onSuccess: () => { setActiveDialog(null); },
  }) as UseTicketActionsReturn['assignAction'];

  const statusAction = useApiMutation({
    mutationFn: (data: { status_id: number; note?: string }) =>
      apiFetch<TicketDetail>(`/tickets/${ticket.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ ...data, expected_status_id: ticket.status.id }),
      }),
    onSuccessMessage: 'Status ticket berhasil diubah.',
    invalidateKeys: [detailKey, ticketKeys.lists()],
    onSuccess: () => { setActiveDialog(null); },
  }) as UseTicketActionsReturn['statusAction'];

  const priorityAction = useApiMutation({
    mutationFn: (data: { priority_id: number }) =>
      apiFetch<TicketDetail>(`/tickets/${ticket.id}/priority`, {
        method: 'POST',
        body: JSON.stringify(data), // No expected_status_id per D-26
      }),
    onSuccessMessage: 'Prioritas ticket berhasil diubah.',
    invalidateKeys: [detailKey, ticketKeys.lists()],
    onSuccess: () => { setActiveDialog(null); },
  }) as UseTicketActionsReturn['priorityAction'];

  const editAction = useApiMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<TicketDetail>(`/tickets/${ticket.id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: 'Ticket berhasil diperbarui.',
    invalidateKeys: [detailKey, ticketKeys.lists()],
    onSuccess: () => { setActiveDialog(null); },
  }) as UseTicketActionsReturn['editAction'];

  const deleteAction = useApiMutation({
    mutationFn: () =>
      apiFetch<void>(`/tickets/${ticket.id}`, {
        method: 'DELETE',
      }),
    onSuccessMessage: 'Ticket berhasil dihapus.',
    invalidateKeys: [ticketKeys.lists()],
    onSuccess: () => { router.push('/tickets'); },
  }) as UseTicketActionsReturn['deleteAction'];

  const openDialog = useCallback((action: TicketAction) => {
    setActiveAction(action);
    switch (action) {
      case 'assign': setActiveDialog('assign'); break;
      case 'start':
      case 'resolve':
      case 'close':
      case 'reopen':
      case 'unassign': setActiveDialog('status'); break;
      case 'cancel': setActiveDialog('cancel'); break;
      case 'change_priority': setActiveDialog('priority'); break;
      case 'edit': setActiveDialog('edit'); break;
      default: setActiveDialog(null);
    }
  }, []);

  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    setActiveAction(null);
  }, []);

  return {
    activeDialog,
    activeAction,
    openDialog,
    closeDialog,
    assignAction,
    statusAction,
    priorityAction,
    editAction,
    deleteAction,
  };
}