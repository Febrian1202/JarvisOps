'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleEditor } from '@/components/knowledge/ArticleEditor';
import { useAuth } from '@/components/providers/auth-provider';
import type { KnowledgeArticleDetail } from '@/types/articles';

interface EditArticlePageClientProps {
  article: KnowledgeArticleDetail;
}

export function EditArticlePageClient({ article }: EditArticlePageClientProps) {
  const router = useRouter();
  const { can } = useAuth();

  const canEdit = can('article.update');
  useEffect(() => {
    if (!canEdit) router.replace('/403');
  }, [canEdit, router]);

  if (!canEdit) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild className="h-8 w-8">
          <Link href={`/knowledge/${article.slug}`} aria-label="Kembali ke detail artikel">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="font-bold text-xl text-foreground tracking-tight">Ubah Artikel</h1>
      </div>
      <ArticleEditor article={article} />
    </div>
  );
}
