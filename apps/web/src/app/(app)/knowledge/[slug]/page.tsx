import React from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArticleDetail } from '@/components/knowledge/ArticleDetail';
import { laravelFetch } from '@/lib/server/api';
import type { KnowledgeArticleDetail } from '@/types/articles';

export const metadata = {
  title: 'Artikel | JARVIS OPS',
};

interface ArticlePayload {
  success: boolean;
  data: KnowledgeArticleDetail;
}

export default async function ArticleDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const res = await laravelFetch(`/articles/${slug}`, { cache: 'no-store' });
  if (!res.ok) {
    notFound();
  }
  const payload = (await res.json()) as ArticlePayload;
  const article = payload.data;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild className="gap-1 text-muted-foreground">
        <Link href="/knowledge">
          <ArrowLeft className="h-3.5 w-3.5" />
          Kembali ke Daftar Artikel
        </Link>
      </Button>
      <ArticleDetail article={article} />
    </div>
  );
}