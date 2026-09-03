'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/client/api';
import { articleKeys } from '@/lib/query-keys';
import { setFormErrors } from '@/lib/client/error-mapper';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAuth } from '@/components/providers/auth-provider';
import { articleSchema, type ArticleFormData } from '@/schemas/article';
import type { KnowledgeArticleDetail } from '@/types/articles';

interface ArticleEditorProps {
  article?: KnowledgeArticleDetail; // present = edit mode
}

export function ArticleEditor({ article }: ArticleEditorProps) {
  const router = useRouter();
  const isEdit = Boolean(article);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<ArticleFormData>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: article?.title ?? '',
      category_id: article?.category?.id,
      content: article?.content ?? '',
      status: article?.status ?? 'draft',
    },
  });

  const { data: categoriesResponse } = useQuery({
    queryKey: articleKeys.categories,
    queryFn: () => apiFetch<{ id: number; name: string }[]>('/knowledge-categories'),
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesResponse?.data ?? [];

  const mutation = useApiMutation({
    mutationFn: (data: ArticleFormData) => {
      const body = isEdit
        ? { title: data.title, category_id: data.category_id, content: data.content }
        : { title: data.title, category_id: data.category_id, content: data.content, status: data.status };
      return apiFetch<KnowledgeArticleDetail>(
        isEdit ? `/articles/${article!.id}` : '/articles',
        { method: isEdit ? 'PUT' : 'POST', body: JSON.stringify(body) }
      );
    },
    onSuccessMessage: isEdit ? 'Artikel berhasil diperbarui.' : 'Artikel berhasil dibuat.',
    onFormError: (backendErrors) => setFormErrors(backendErrors, setError),
    onSuccess: (res) => {
      router.push(`/knowledge/${res.data?.slug}`);
    },
  });

  const mainColumnClass = isEdit ? 'space-y-6 lg:col-span-8' : 'space-y-6 lg:col-span-12';

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className={mainColumnClass}>
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="title">Judul <span className="text-destructive">*</span></Label>
            <Input id="title" placeholder="Contoh: Cara Reset Password" {...register('title')} aria-invalid={!!errors.title} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="category_id">Kategori <span className="text-destructive">*</span></Label>
            <Controller
              control={control}
              name="category_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : undefined}
                  onValueChange={(v) => field.onChange(Number(v))}
                >
                  <SelectTrigger id="category_id" aria-invalid={!!errors.category_id}>
                    <SelectValue placeholder="Pilih kategori…" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
          </div>

          {isEdit && article && (
            <div className="space-y-1.5">
              <Label htmlFor="slug">Slug <span className="text-muted-foreground">(tidak dapat diubah — D-18)</span></Label>
              <Input id="slug" value={article.slug} readOnly className="bg-muted/40 text-muted-foreground" />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="content">Konten (Markdown) <span className="text-destructive">*</span></Label>
            <Textarea id="content" rows={14} className="font-mono text-sm" placeholder="Tulis isi artikel dalam format Markdown…" {...register('content')} aria-invalid={!!errors.content} />
            {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/knowledge">Batal</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Buat Artikel'}
          </Button>
        </div>
      </div>

      {isEdit && article ? (
        <div className="space-y-6 lg:col-span-4">
          <PublishPanel article={article} />
        </div>
      ) : null}
    </form>
  );
}

function PublishPanel({ article }: { article: KnowledgeArticleDetail }) {
  const { can } = useAuth();
  const canPublish = can('article.publish');
  const canUnpublish = can('article.unpublish');

  const publishMutation = useApiMutation({
    mutationFn: () =>
      apiFetch<KnowledgeArticleDetail>(`/articles/${article.id}/publish`, { method: 'POST' }),
    onSuccessMessage: 'Artikel berhasil dipublikasikan.',
    invalidateKeys: [articleKeys.edit(article.id), articleKeys.lists()],
  });

  const unpublishMutation = useApiMutation({
    mutationFn: () =>
      apiFetch<KnowledgeArticleDetail>(`/articles/${article.id}/unpublish`, { method: 'POST' }),
    onSuccessMessage: 'Artikel berhasil diturunkan.',
    invalidateKeys: [articleKeys.edit(article.id), articleKeys.lists()],
  });

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Status Publikasi</h2>
      <p className="text-xs text-muted-foreground">
        Status saat ini:{' '}
        <strong>{article.status === 'published' ? 'Dipublikasikan' : 'Draf'}</strong>
      </p>
      <div className="flex flex-col gap-2">
        {canPublish && article.status !== 'published' && (
          <Button size="sm" onClick={() => publishMutation.mutate()} disabled={publishMutation.isPending}>
            {publishMutation.isPending ? 'Menerbitkan…' : 'Terbitkan'}
          </Button>
        )}
        {canUnpublish && article.status === 'published' && (
          <Button size="sm" variant="outline" onClick={() => unpublishMutation.mutate()} disabled={unpublishMutation.isPending}>
            {unpublishMutation.isPending ? 'Menurunkan…' : 'Turunkan (Unpublish)'}
          </Button>
        )}
      </div>
    </div>
  );
}
