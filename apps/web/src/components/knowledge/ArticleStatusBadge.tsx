import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getArticleStatusLabel } from '@/lib/labels';
import type { ArticleStatus } from '@/types/articles';
import { cn } from '@/lib/utils';

interface ArticleStatusBadgeProps {
  status: ArticleStatus | string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  published: 'bg-[#eaf0e6] text-[#4d663e] border-[#d9e5d4]',
  draft: 'bg-[#eceae4] text-[#1c1c1c] border-[#dcd9d0]',
};

export function ArticleStatusBadge({ status, className }: ArticleStatusBadgeProps) {
  const normalized = status.toLowerCase();
  const styleClass = STATUS_STYLES[normalized] ?? STATUS_STYLES.draft;
  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs px-2.5 py-0.5 rounded-full shadow-none', styleClass, className)}
    >
      {getArticleStatusLabel(normalized)}
    </Badge>
  );
}
