import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';

interface PagePlaceholderProps {
  title: string;
  description: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
}

export function PagePlaceholder({
  title,
  description,
  icon: Icon,
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-6">
          {Icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius)] bg-primary/10 text-primary">
              <Icon className="h-6 w-6" />
            </div>
          )}
          <div>
            <CardTitle className="font-semibold text-lg">{title}</CardTitle>
            <CardDescription className="text-sm">{description}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="flex flex-col items-center justify-center rounded-[var(--radius)] border border-border/60 border-dashed bg-muted/20 py-12 text-center">
            <p className="font-medium text-foreground text-sm">
              Modul Sedang Disiapkan
            </p>
            <p className="mt-1 max-w-sm text-muted-foreground text-xs">
              Antarmuka halaman {title} akan dihubungkan secara penuh dengan API
              dan state management pada sub-tahap berikutnya.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
