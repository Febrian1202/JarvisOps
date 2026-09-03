'use client';

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useApiMutation } from '@/hooks/useApiMutation';
import { apiFetch } from '@/lib/client/api';
import { ticketKeys } from '@/lib/query-keys';
import type { TicketComment } from '@/types/tickets';
import { useAuth } from '@/components/providers/auth-provider';

interface CommentFormProps {
  ticketId: number;
  enabled?: boolean;
  onCommented?: () => void;
}

export function CommentForm({ ticketId, enabled = true, onCommented }: CommentFormProps) {
  const [body, setBody] = useState('');
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const commentsKey = ticketKeys.comments(ticketId);

  const commentMutation = useApiMutation({
    mutationFn: (text: string) =>
      apiFetch<TicketComment>(`/tickets/${ticketId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: text }),
      }),
    onSuccessMessage: 'Komentar berhasil ditambahkan.',
    onSuccess: (res: { data: TicketComment }) => {
      const real = res.data;
      // Replace temp entry (negative id) with the real server comment
      queryClient.setQueryData<TicketComment[]>(commentsKey, (old = []) => {
        const existing = old ?? [];
        const pending = existing.find((c) => c.id < 0);
        if (pending) {
          return existing.map((c) => (c.id === pending.id ? real : c));
        }
        return [...existing, real];
      });
      setBody('');
      onCommented?.();
    },
    onError: () => {
      // Rollback: refetch comments from server, dropping any temp/pending entry
      void queryClient.invalidateQueries({ queryKey: commentsKey });
    },
  });

  const optimisticAdd = () => {
    const text = body.trim();
    if (!text) return;

    // Insert a temporary comment (negative id marks it as pending)
    const tempComment: TicketComment = {
      id: -Date.now(),
      ticket_id: ticketId,
      user: {
        id: user?.id ?? 0,
        full_name: user?.full_name ?? 'Anda',
      },
      body: text,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    queryClient.setQueryData<TicketComment[]>(commentsKey, (old = []) => [
      ...(old ?? []),
      tempComment,
    ]);

    setBody('');
    commentMutation.mutate(text);
  };

  if (!enabled) return null;

  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        optimisticAdd();
      }}
    >
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Tulis komentar atau pembaruan penanganan…"
        rows={3}
        className="resize-none text-sm"
        aria-label="Tulis komentar"
      />
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Komentar akan terlihat oleh seluruh pihak yang menangani tiket.
        </p>
        <Button
          type="submit"
          size="sm"
          disabled={!body.trim() || commentMutation.isPending}
          className="gap-1.5"
        >
          <Send className="h-3.5 w-3.5" />
          {commentMutation.isPending ? 'Mengirim…' : 'Kirim Komentar'}
        </Button>
      </div>
    </form>
  );
}