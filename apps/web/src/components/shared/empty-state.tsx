import React from 'react';
import { FileX2, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({
  title = 'Tidak ada data ditemukan',
  description = 'Belum ada data untuk ditampilkan pada kategori atau filter ini.',
  icon: Icon = FileX2,
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-[var(--radius)] border border-border border-dashed p-8 text-center animate-in fade-in-50">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mt-3 font-semibold text-foreground text-sm tracking-tight">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-muted-foreground text-xs leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <Button
          onClick={onAction}
          variant="outline"
          size="sm"
          className="mt-4 rounded-[var(--radius)] text-xs"
        >
          {actionText}
        </Button>
      )}
    </div>
  );
}
