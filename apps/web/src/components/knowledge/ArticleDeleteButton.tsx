'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { apiFetch } from '@/lib/client/api';
import { articleKeys } from '@/lib/query-keys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAuth } from '@/components/providers/auth-provider';
import { cn } from '@/lib/utils';

interface ArticleDeleteButtonProps {
  articleId: number;
  authorId: number | null;
  className?: string;
}

export function ArticleDeleteButton({ articleId, authorId, className }: ArticleDeleteButtonProps) {
  const router = useRouter();
  const { can, hasRole, user } = useAuth();
  const [open, setOpen] = React.useState(false);

  // Mirrors ArticlePolicy::delete — admin/manager may delete any article,
  // a technician only their own. The backend remains the real gate.
  const canDelete =
    can('article.delete') &&
    (hasRole('administrator') ||
      hasRole('manager') ||
      (user?.id != null && authorId === user.id));

  const deleteMutation = useApiMutation<void, null>({
    mutationFn: () => apiFetch<null>(`/articles/${articleId}`, { method: 'DELETE' }),
    onSuccessMessage: 'Artikel berhasil dihapus.',
    invalidateKeys: [articleKeys.lists()],
    onSuccess: () => {
      setOpen(false);
      router.push('/knowledge');
    },
  });

  if (!canDelete) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          'gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive',
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Hapus Artikel</span>
      </Button>

      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Hapus Artikel?"
        description="Artikel akan dihapus dan tidak lagi tampil di basis pengetahuan. Tindakan ini tidak dapat dibatalkan dari antarmuka."
        confirmText="Ya, Hapus"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
