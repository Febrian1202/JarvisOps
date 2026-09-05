'use client';

import React from 'react';
import Link from 'next/link';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';

interface ArticleEditButtonProps {
  slug: string;
}

export function ArticleEditButton({ slug }: ArticleEditButtonProps) {
  const { can } = useAuth();

  if (!can('article.update')) {
    return null;
  }

  return (
    <Button asChild size="sm" variant="outline" className="gap-1.5 self-start">
      <Link href={`/knowledge/${slug}/edit`}>
        <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Ubah Artikel</span>
      </Link>
    </Button>
  );
}
