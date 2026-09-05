'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Boxes } from 'lucide-react';
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
import { assetKeys } from '@/lib/query-keys';
import { setFormErrors } from '@/lib/client/error-mapper';
import { useApiMutation } from '@/hooks/useApiMutation';
import { assetSchema, ASSET_FORM_STATUSES, type AssetFormData } from '@/schemas/asset';
import type { AssetDetail, AssetStatus } from '@/types/assets';

interface AssetFormProps {
  asset?: AssetDetail; // present = edit mode
}

export function AssetForm({ asset }: AssetFormProps) {
  const router = useRouter();
  const isEdit = Boolean(asset);

  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors },
  } = useForm<AssetFormData>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      asset_tag: asset?.asset_tag ?? '',
      name: asset?.name ?? '',
      category: asset?.category ?? '',
      brand: asset?.brand ?? '',
      model: asset?.model ?? '',
      serial_number: asset?.serial_number ?? '',
      purchase_date: asset?.purchase_date ?? '',
      status: (asset?.status ?? 'available') as AssetStatus,
      notes: asset?.notes ?? '',
    },
  });

  const [categoryMode, setCategoryMode] = useState<'select' | 'free'>('select');
  const [selectedCategory, setSelectedCategory] = useState<string>(asset?.category ?? '');

  const { data: categoriesResponse } = useQuery({
    queryKey: assetKeys.categories,
    queryFn: () => apiFetch<string[]>('/assets/categories'),
    staleTime: 5 * 60 * 1000,
  });
  const categories = categoriesResponse?.data ?? [];

  const mutation = useApiMutation({
    mutationFn: (data: AssetFormData) => {
      const body = {
        ...data,
        category:
          categoryMode === 'free' ? selectedCategory : data.category,
        notes: data.notes || null,
      };
      return apiFetch<AssetDetail>(isEdit ? `/assets/${asset!.id}` : '/assets', {
        method: isEdit ? 'PUT' : 'POST',
        body: JSON.stringify(body),
      });
    },
    onSuccessMessage: isEdit ? 'Aset berhasil diperbarui.' : 'Aset berhasil ditambahkan.',
    onFormError: (backendErrors) => {
      setFormErrors(backendErrors, setError);
    },
    onSuccess: (res) => {
      router.push(`/assets/${res.data?.id}`);
    },
  });

  const statusLabels: Record<string, string> = {
    available: 'Tersedia',
    maintenance: 'Perawatan',
    retired: 'Pensiun',
    lost: 'Hilang',
  };

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      {/* Left: Form fields */}
      <div className="space-y-6 lg:col-span-8">
        <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-5">
          {/* Tag & Name */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="asset_tag">
                Kode Aset <span className="text-destructive">*</span>
              </Label>
              <Input
                id="asset_tag"
                placeholder="Contoh: LPT-0001"
                className="h-11 sm:h-9 text-base sm:text-sm"
                {...register('asset_tag')}
                aria-invalid={!!errors.asset_tag}
              />
              {errors.asset_tag && <p className="text-xs text-destructive">{errors.asset_tag.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">
                Nama Aset <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Contoh: ThinkPad T14"
                className="h-11 sm:h-9 text-base sm:text-sm"
                {...register('name')}
                aria-invalid={!!errors.name}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">
              Kategori <span className="text-destructive">*</span>
            </Label>
            {categoryMode === 'select' ? (
              <div className="flex gap-2">
                <Controller
                  control={control}
                  name="category"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        setSelectedCategory(v);
                      }}
                    >
                      <SelectTrigger className="flex-1 h-11 sm:h-9 text-base sm:text-sm" aria-invalid={!!errors.category}>
                        <SelectValue placeholder="Pilih kategori…" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryMode('free')}
                  className="shrink-0"
                >
                  Kategori lain
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  placeholder="Ketik kategori baru…"
                  className="flex-1 h-11 sm:h-9 text-base sm:text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryMode('select')}
                  className="shrink-0"
                >
                  Pilih dari daftar
                </Button>
              </div>
            )}
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          {/* Brand & Model */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="brand">
                Merek <span className="text-destructive">*</span>
              </Label>
              <Input
                id="brand"
                placeholder="Contoh: Lenovo"
                className="h-11 sm:h-9 text-base sm:text-sm"
                {...register('brand')}
                aria-invalid={!!errors.brand}
              />
              {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="model">
                Model <span className="text-destructive">*</span>
              </Label>
              <Input
                id="model"
                placeholder="Contoh: T14 Gen 3"
                className="h-11 sm:h-9 text-base sm:text-sm"
                {...register('model')}
                aria-invalid={!!errors.model}
              />
              {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
            </div>
          </div>

          {/* Serial & Purchase Date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="serial_number">
                Nomor Seri <span className="text-destructive">*</span>
              </Label>
              <Input
                id="serial_number"
                placeholder="Contoh: PF3ABCDE"
                className="h-11 sm:h-9 text-base sm:text-sm"
                {...register('serial_number')}
                aria-invalid={!!errors.serial_number}
              />
              {errors.serial_number && <p className="text-xs text-destructive">{errors.serial_number.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="purchase_date">
                Tanggal Pembelian <span className="text-destructive">*</span>
              </Label>
              <Input
                id="purchase_date"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                className="h-11 sm:h-9 text-base sm:text-sm"
                {...register('purchase_date')}
                aria-invalid={!!errors.purchase_date}
              />
              {errors.purchase_date && <p className="text-xs text-destructive">{errors.purchase_date.message}</p>}
            </div>
          </div>

          {/* Status */}
          <div className="space-y-1.5">
            <Label htmlFor="status">
              Status <span className="text-destructive">*</span>
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="status" className="h-11 sm:h-9 text-base sm:text-sm" aria-invalid={!!errors.status}>
                    <SelectValue placeholder="Pilih status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {ASSET_FORM_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.status && <p className="text-xs text-destructive">{errors.status.message}</p>}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Catatan</Label>
            <Textarea id="notes" rows={3} placeholder="Catatan tambahan (opsional)…" {...register('notes')} />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/assets">Batal</Link>
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? 'Menyimpan…' : isEdit ? 'Simpan Perubahan' : 'Tambah Aset'}
          </Button>
        </div>
      </div>

      {/* Right: Info sidebar */}
      <div className="space-y-6 lg:col-span-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Boxes className="h-4 w-4 text-primary" />
            Informasi Status
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
            <span>
              Status <strong>Ditugaskan</strong> dikelola otomatis melalui alur assign/release dan
              tidak tersedia pada formulir ini.
            </span>
          </div>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><strong className="text-foreground">Tersedia</strong> — aset siap ditugaskan.</li>
            <li><strong className="text-foreground">Perawatan</strong> — sedang diperbaiki.</li>
            <li><strong className="text-foreground">Pensiun</strong> — tidak lagi digunakan.</li>
            <li><strong className="text-foreground">Hilang</strong> — lokasi tidak diketahui.</li>
          </ul>
        </div>
      </div>
    </form>
  );
}