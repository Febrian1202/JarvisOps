import React from 'react';
import Link from 'next/link';
import { CalendarDays, Eye } from 'lucide-react';
import { MarkdownRenderer } from '@/components/shared/markdown-renderer';
import { ArticleStatusBadge } from './ArticleStatusBadge';
import { RelativeTime } from '@/components/shared/relative-time';
import type { KnowledgeArticleDetail } from '@/types/articles';

interface ArticleDetailProps {
  article: KnowledgeArticleDetail;
}

export function ArticleDetail({ article }: ArticleDetailProps) {
  return (
    <article className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">{article.category?.name ?? '—'}</span>
          <ArticleStatusBadge status={article.status} />
        </div>
        <h1 className="font-bold text-2xl text-foreground tracking-tight">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span>Oleh <strong className="text-foreground">{article.author?.full_name ?? '—'}</strong></span>
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5" /> {article.view_count} kali dilihat
          </span>
          {article.published_at && (
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              <RelativeTime date={article.published_at} />
            </span>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
        <MarkdownRenderer content={article.content} />
      </div>

      {article.related_articles && article.related_articles.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <h2 className="text-sm font-semibold text-foreground mb-3">Artikel Terkait</h2>
          <ul className="space-y-2">
            {article.related_articles.map((ra) => (
              <li key={ra.id}>
                <Link href={`/knowledge/${ra.slug}`} className="text-sm text-primary hover:underline">
                  {ra.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}