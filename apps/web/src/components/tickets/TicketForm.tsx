'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { Clock, BookOpen, AlertCircle, FileText } from 'lucide-react';
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
import { FileUpload } from '@/components/shared/file-upload';
import { useReferenceData } from '@/hooks/use-reference-data';
import { useApiMutation } from '@/hooks/useApiMutation';
import { apiFetch } from '@/lib/client/api';
import { setFormErrors } from '@/lib/client/error-mapper';
import { useDebounce } from '@/hooks/use-debounce';
import { ticketSchema, type TicketFormData } from '@/schemas/ticket';
import type { AssignableAsset } from '@/types/assets';
import type { KnowledgeArticleListItem } from '@/types/articles';
import type { TicketDetail } from '@/types/tickets';

export function TicketForm() {
  const router = useRouter();
  const { categories, priorities } = useReferenceData();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TicketFormData>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      category_id: undefined,
      priority_id: undefined,
      asset_id: null,
      title: '',
      description: '',
    },
  });

  const selectedPriorityId = useWatch({ control, name: 'priority_id' });
  const watchedTitle = useWatch({ control, name: 'title' });
  const debouncedTitle = useDebounce(watchedTitle, 500);

  // 1. Fetch user's assignable assets
  const { data: assetsResponse } = useQuery({
    queryKey: ['assets', 'assignable'],
    queryFn: () => apiFetch<AssignableAsset[]>('/assets/assignable'),
  });
  const assignableAssets = assetsResponse?.data ?? [];

  // 2. KB Article suggestions based on title
  const { data: kbResponse } = useQuery({
    queryKey: ['articles', 'suggestions', debouncedTitle],
    queryFn: () => apiFetch<KnowledgeArticleListItem[]>(`/articles?search=${encodeURIComponent(debouncedTitle)}&per_page=3`),
    enabled: Boolean(debouncedTitle && debouncedTitle.length >= 3),
  });
  const suggestedArticles = kbResponse?.data ?? [];

  // 3. Selected Priority Details for SLA Preview
  const selectedPriority = priorities.find((p) => p.id === Number(selectedPriorityId));

  // 4. Create Mutation
  const createMutation = useApiMutation({
    mutationFn: (data: TicketFormData) =>
      apiFetch<TicketDetail>('/tickets', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: 'Tiket berhasil dibuat.',
    onFormError: (backendErrors) => {
      setFormErrors(backendErrors, setError);
    },
    onSuccess: async (res) => {
      const newTicketId = res.data?.id;
      if (selectedFile && newTicketId) {
        // Upload attachment in background
        const formData = new FormData();
        formData.append('file', selectedFile);
        try {
          await fetch(`/api/proxy/tickets/${newTicketId}/attachments`, {
            method: 'POST',
            body: formData,
          });
        } catch {
          // background upload error handled silently or user can re-upload in detail page
        }
      }
      router.push(`/tickets/${newTicketId}`);
    },
  });

  const onSubmit = (data: TicketFormData) => {
    createMutation.mutate(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left Column: Form Fields */}
      <div className="space-y-6 lg:col-span-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          {/* Category & Priority Row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="category_id">
                Kategori <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="category_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger id="category_id" aria-invalid={!!errors.category_id}>
                      <SelectValue placeholder="Pilih kategori tiket…" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={String(cat.id)}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.category_id && (
                <p className="text-xs text-destructive">{errors.category_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="priority_id">
                Prioritas <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="priority_id"
                render={({ field }) => (
                  <Select
                    value={field.value ? String(field.value) : ''}
                    onValueChange={(val) => field.onChange(Number(val))}
                  >
                    <SelectTrigger id="priority_id" aria-invalid={!!errors.priority_id}>
                      <SelectValue placeholder="Pilih tingkat urgensi…" />
                    </SelectTrigger>
                    <SelectContent>
                      {priorities.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name} — SLA {Math.round(p.sla_minutes / 60)} Jam
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priority_id && (
                <p className="text-xs text-destructive">{errors.priority_id.message}</p>
              )}
            </div>
          </div>

          {/* Asset Picker (Optional) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="asset_id">Aset Terkait (Opsional)</Label>
              <span className="text-xs text-muted-foreground">Hanya aset yang Anda pegang</span>
            </div>
            <Controller
              control={control}
              name="asset_id"
              render={({ field }) => (
                <Select
                  value={field.value ? String(field.value) : 'NONE'}
                  onValueChange={(val) => field.onChange(val === 'NONE' ? null : Number(val))}
                >
                  <SelectTrigger id="asset_id">
                    <SelectValue placeholder="Pilih perangkat aset jika ada…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Tidak Ada Aset Terkait</SelectItem>
                    {assignableAssets.map((ast) => (
                      <SelectItem key={ast.id} value={String(ast.id)}>
                        {ast.asset_tag} — {ast.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Title Field */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Judul Permohonan <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="Contoh: Wi-Fi lantai 3 sering putus saat meeting daring"
              {...register('title')}
              aria-invalid={!!errors.title}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Description Field */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Deskripsi Detail Masalah <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              rows={5}
              placeholder="Jelaskan secara runtut gejala kendala teknis yang dialami, pesan error yang muncul, dan langkah yang sudah dicoba…"
              {...register('description')}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          {/* File Upload Attachment */}
          <div className="space-y-1.5">
            <Label>Lampiran Berkas / Dokumen Pendukung</Label>
            <FileUpload
              file={selectedFile}
              onFileSelect={setSelectedFile}
              disabled={isSubmitting || createMutation.isPending}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/tickets">Batal</Link>
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || createMutation.isPending}
          >
            {isSubmitting || createMutation.isPending
              ? 'Membuat Tiket…'
              : 'Kirim Tiket (Status: OPEN)'}
          </Button>
        </div>
      </div>

      {/* Right Column: SLA Preview & KB Suggestion Cards */}
      <div className="space-y-6 lg:col-span-4">
        {/* SLA Preview Card */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
            <Clock className="h-4 w-4 text-primary" />
            <span>Target SLA yang Berlaku</span>
          </div>

          {selectedPriority ? (
            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {Math.round(selectedPriority.sla_minutes / 60)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">Jam Kerja</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Batas waktu penyelesaian dihitung secara akurat sejak tiket diterbitkan.
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Pilih tingkat prioritas di formulir untuk melihat batas durasi SLA.
            </p>
          )}

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              SLA di-snapshot secara permanen saat tiket dibuat dan tidak akan berubah.
            </span>
          </div>
        </div>

        {/* KB Suggestions Card */}
        {suggestedArticles.length > 0 && (
          <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>Sudah Cek Artikel Terkait?</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Masalah Anda mungkin sudah memiliki panduan solusi mandiri:
            </p>
            <div className="space-y-2">
              {suggestedArticles.map((art) => (
                <Link
                  key={art.id}
                  href={`/knowledge/${art.slug}`}
                  target="_blank"
                  className="flex items-center gap-2 rounded-lg border border-border p-2.5 text-xs font-medium text-foreground hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="line-clamp-1">{art.title}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}
