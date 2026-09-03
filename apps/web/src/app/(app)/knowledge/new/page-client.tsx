'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArticleEditor } from '@/components/knowledge/ArticleEditor';
import { useAuth } from '@/components/providers/auth-provider';

export function CreateArticlePageClient() {
  const router = useRouter();
  const { can } = useAuth();

  const canCreate = can('article.create');
  useEffect(() => {
    if (!canCreate) router.replace('/403');
  }, [canCreate, router]);

  if (!canCreate) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/knowledge" aria-label="Kembali ke daftar artikel">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-bold text-xl text-foreground tracking-tight">
            Buat Artikel Baru
          </h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm pl-10">
          Tulis panduan atau dokumentasi solusi untuk menambah basis pengetahuan IT.
        </p>
      </div>

      <ArticleEditor />
    </div>
  );
}
