import React from 'react';
import Link from 'next/link';
import { CalendarDays, Eye, Pencil } from 'lucide-react';
import { ArticleStatusBadge } from './ArticleStatusBadge';
import { RelativeTime } from '@/components/shared/relative-time';
import { Button } from '@/components/ui/button';
import type { KnowledgeArticleListItem } from '@/types/articles';
import { cn } from '@/lib/utils';

interface ArticleCardProps {
  article: KnowledgeArticleListItem;
  showStatus?: boolean;
  canEdit?: boolean;
}

export function ArticleCard({ article, showStatus = true, canEdit = false }: ArticleCardProps) {
  return (
    <li
      className={cn(
        'group relative flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors',
        'hover:border-foreground/20 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2'
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{article.category?.name ?? '—'}</span>
        <div className="flex items-center gap-1">
          {showStatus && <ArticleStatusBadge status={article.status} />}
          {canEdit && (
            <Button
              asChild
              variant="ghost"
              size="icon-xs"
              className="relative z-10 text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
            >
              <Link
                href={`/knowledge/${article.slug}/edit`}
                aria-label={`Ubah artikel: ${article.title}`}
                className="flex items-center justify-center h-full w-full"
              >
                <Pencil className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      </div>

      <h3 className="mb-4 line-clamp-2 text-base font-semibold tracking-tight text-foreground">
        <Link
          href={`/knowledge/${article.slug}`}
          className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none group-hover:text-primary group-hover:underline"
        >
          {article.title}
        </Link>
      </h3>

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <span>
          Oleh <strong className="font-medium text-foreground">{article.author?.full_name ?? '—'}</strong>
        </span>
        <span className="flex items-center gap-1">
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{article.view_count} dilihat</span>
        </span>
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          <RelativeTime date={article.published_at ?? article.created_at} />
        </span>
      </div>
    </li>
  );
}
