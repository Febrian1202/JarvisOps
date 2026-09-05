'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Clock, Building2, Cpu } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TicketDetailBanner } from '@/components/tickets/TicketDetailBanner';
import { SlaTracker } from '@/components/tickets/SlaTracker';
import { TicketTimeline, TimelineHeader } from '@/components/tickets/TicketTimeline';
import { TicketMobileActionBar } from '@/components/tickets/TicketMobileActionBar';
import { CommentForm } from '@/components/tickets/CommentForm';
import { AttachmentList, AttachmentSectionTitle } from '@/components/tickets/AttachmentList';
import { ActionDialogs } from '@/components/tickets/action-dialogs';
import { useTicketActions } from '@/components/tickets/use-ticket-actions';
import { mergeTimeline } from '@/components/tickets/timeline-merge';
import { EmptyState } from '@/components/shared/empty-state';
import { apiFetch, ApiClientError } from '@/lib/client/api';
import { ticketKeys } from '@/lib/query-keys';
import type { TicketComment, TicketHistoryItem, TicketDetail, TicketAction } from '@/types/tickets';

function TicketLoaded({ ticket }: { ticket: TicketDetail }) {
  const ticketId = ticket.id;

  const { data: commentsResponse } = useQuery({
    queryKey: ticketKeys.comments(ticketId),
    queryFn: () => apiFetch<TicketComment[]>(`/tickets/${ticketId}/comments?per_page=100`),
  });

  const { data: historiesResponse } = useQuery({
    queryKey: ticketKeys.histories(ticketId),
    queryFn: () => apiFetch<TicketHistoryItem[]>(`/tickets/${ticketId}/histories`),
  });

  const comments = commentsResponse?.data ?? [];
  const histories = historiesResponse?.data ?? [];
  const entries = mergeTimeline(comments, histories);

  const actions = useTicketActions(ticket);
  const canComment = ticket.available_actions.includes('comment' as TicketAction);
  const canAttach = ticket.available_actions.includes('attach' as TicketAction);

  return (
    <div className="space-y-6 pb-20 sm:pb-0">
      {/* Back link */}
      <div>
        <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
          <Link href="/tickets">
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Daftar Tiket
          </Link>
        </Button>
      </div>

      {/* Banner */}
      <TicketDetailBanner ticket={ticket} onAction={(action) => actions.openDialog(action as TicketAction)} />

      {/* Main layout: left timeline, right sidebar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Timeline & Comment */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <div className="mb-4">
              <TimelineHeader />
            </div>
            <TicketTimeline entries={entries} />
            <div id="ticket-comment-section" className="mt-4 border-t border-border pt-4">
              <CommentForm ticketId={ticket.id} enabled={canComment} />
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* SLA Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-primary" />
              Batas Waktu (SLA)
            </div>
            <SlaTracker
              slaStatus={ticket.sla_status}
              duration={ticket.sla_duration_minutes}
              remaining={ticket.sla_remaining_minutes}
            />
          </div>

          {/* Related Info Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 className="h-4 w-4 text-primary" />
              Informasi Tiket
            </div>
            <dl className="space-y-2 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Departemen</dt>
                <dd className="font-medium text-foreground">{ticket.department?.name ?? '-'}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Kategori</dt>
                <dd className="font-medium text-foreground">{ticket.category.name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Prioritas</dt>
                <dd className="font-medium text-foreground">{ticket.priority.name}</dd>
              </div>
            </dl>

            {ticket.asset && (
              <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <Cpu className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{ticket.asset.asset_tag}</p>
                  <p className="text-muted-foreground truncate">{ticket.asset.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Attachments Card */}
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <AttachmentSectionTitle count={ticket.attachments_count} />
            <AttachmentList ticketId={ticket.id} canUpload={canAttach} />
          </div>
        </div>
      </div>

      {/* Action Dialogs */}
      <ActionDialogs
        ticket={ticket}
        activeDialog={actions.activeDialog}
        activeAction={actions.activeAction}
        onClose={actions.closeDialog}
        onAssign={(d) => actions.assignAction.mutate(d)}
        onStatus={(d) => actions.statusAction.mutate(d)}
        onPriority={(d) => actions.priorityAction.mutate(d)}
        onEdit={(d) => actions.editAction.mutate(d)}
        onDelete={() => actions.deleteAction.mutate()}
        isDeletePending={actions.deleteAction.isPending}
        isEditPending={actions.editAction.isPending}
        isStatusPending={actions.statusAction.isPending}
        isAssignPending={actions.assignAction.isPending}
      />

      <TicketMobileActionBar
        ticket={ticket}
        onAction={(action) => actions.openDialog(action)}
        onCommentClick={() => {
          document.getElementById('ticket-comment-section')?.scrollIntoView({ behavior: 'smooth' });
          document.getElementById('content')?.focus();
        }}
      />
    </div>
  );
}

export function TicketDetailPageClient({ ticketId }: { ticketId: number }) {
  const router = useRouter();
  const { data: detailResponse, isLoading, error } = useQuery({
    queryKey: ticketKeys.detail(ticketId),
    queryFn: () => apiFetch<TicketDetail>(`/tickets/${ticketId}`),
    enabled: Number.isFinite(ticketId),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !detailResponse?.data) {
    const is404 = error instanceof ApiClientError && error.status === 404;
    const is403 = error instanceof ApiClientError && error.status === 403;

    return (
      <div className="rounded-xl border border-border bg-card p-12 text-center shadow-xs">
        <EmptyState
          title={
            is404
              ? 'Tiket Tidak Ditemukan'
              : is403
                ? 'Akses Tiket Ditolak'
                : 'Gagal Memuat Tiket'
          }
          description={
            is404
              ? 'Tiket dengan nomor atau ID tersebut tidak ditemukan dalam sistem.'
              : is403
                ? 'Anda tidak memiliki hak akses untuk melihat tiket ini.'
                : 'Terjadi kendala saat memuat data tiket. Silakan coba kembali.'
          }
          actionText="Kembali ke Daftar Tiket"
          onAction={() => router.push('/tickets')}
        />
      </div>
    );
  }

  return <TicketLoaded ticket={detailResponse.data} />;
}