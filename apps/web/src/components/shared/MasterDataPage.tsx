'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ZodObject, ZodRawShape } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/client/api';
import { useApiMutation } from '@/hooks/useApiMutation';
import { DataTable, type ColumnDef } from '@/components/shared/data-table/data-table';
import { SearchInput } from '@/components/shared/search-input';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

export interface FormFieldDef {
  name: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select';
  placeholder?: string;
  required?: boolean;
  hint?: string;
  options?: { value: string; label: string }[];
}

export interface MasterDataConfig<T extends { id: number }> {
  title: string;
  description?: string;
  endpoint: string; // e.g. '/departments'
  queryKey: readonly string[];
  columns: ColumnDef<T>[];
  formFields: FormFieldDef[] | ((items: T[], editingItem: T | null) => FormFieldDef[]);
  zodSchema: ZodObject<ZodRawShape>;
  searchField?: keyof T;
  deleteMessage?: string;
  onSuccessMessage?: string;
  transformToForm?: (item: T) => Record<string, unknown>;
}

export function MasterDataPage<T extends { id: number }>({
  title,
  description,
  endpoint,
  queryKey,
  columns,
  formFields,
  zodSchema,
  searchField = 'name' as keyof T,
  deleteMessage = 'Apakah Anda yakin ingin menghapus data ini?',
  transformToForm,
}: MasterDataConfig<T>) {
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<T | null>(null);
  const [deletingItem, setDeletingItem] = useState<T | null>(null);

  // 1. Query for master data (array response without meta)
  const { data: response, isLoading } = useQuery({
    queryKey: [...queryKey],
    queryFn: () => apiFetch<T[]>(endpoint),
  });

  // Client-side filtering for small master data lists
  const filteredData = useMemo(() => {
    const list = response?.data ?? [];
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter((item) => {
      const val = item[searchField];
      return typeof val === 'string' && val.toLowerCase().includes(term);
    });
  }, [response?.data, search, searchField]);

  // 2. Mutations
  const createMutation = useApiMutation({
    mutationFn: (data: Record<string, unknown>) =>
      apiFetch<T>(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: `${title} berhasil ditambahkan.`,
    invalidateKeys: [queryKey],
    onSuccess: () => {
      setIsCreateOpen(false);
      reset();
    },
  });

  const updateMutation = useApiMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) =>
      apiFetch<T>(`${endpoint}/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: `${title} berhasil diperbarui.`,
    invalidateKeys: [queryKey],
    onSuccess: () => {
      setEditingItem(null);
      reset();
    },
  });

  const deleteMutation = useApiMutation({
    mutationFn: (id: number) =>
      apiFetch<void>(`${endpoint}/${id}`, {
        method: 'DELETE',
      }),
    onSuccessMessage: `${title} berhasil dihapus.`,
    invalidateKeys: [queryKey],
    onSuccess: () => {
      setDeletingItem(null);
    },
  });

  // 3. Form setup
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(zodSchema),
  });

  const onSubmit = (formData: Record<string, unknown>) => {
    if (editingItem) {
      updateMutation.mutate({ id: editingItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleOpenEdit = useCallback((item: T) => {
    setEditingItem(item);
    const formData = transformToForm ? transformToForm(item) : (item as Record<string, unknown>);
    reset(formData);
  }, [reset, transformToForm]);

  const handleOpenCreate = () => {
    reset({});
    setIsCreateOpen(true);
  };

  // 4. Action column definition
  const allColumns = useMemo(() => {
    const actionCol: ColumnDef<T> = {
      id: 'actions',
      header: 'Aksi',
      className: 'w-24 text-right',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => handleOpenEdit(row)}
            aria-label="Ubah data"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive/90"
            onClick={() => setDeletingItem(row)}
            aria-label="Hapus data"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    };
    return [...columns, actionCol];
  }, [columns, handleOpenEdit]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        <Button onClick={handleOpenCreate} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Tambah {title}
        </Button>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="w-full sm:max-w-xs">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder={`Cari ${title.toLowerCase()}...`}
          />
        </div>
      </div>

      <DataTable
        columns={allColumns}
        data={filteredData}
        isLoading={isLoading}
        emptyTitle={`Belum ada data ${title.toLowerCase()}`}
        emptyDescription="Klik tombol tambah di atas untuk menambahkan data baru."
      />

      {/* Create / Edit Dialog */}
      <Dialog
        open={isCreateOpen || !!editingItem}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingItem(null);
            reset();
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? `Ubah ${title}` : `Tambah ${title}`}
            </DialogTitle>
            <DialogDescription>
              Isi data formulir berikut dengan lengkap.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
            {(typeof formFields === 'function'
              ? formFields(response?.data ?? [], editingItem)
              : formFields
            ).map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="text-sm font-medium">
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === 'textarea' ? (
                  <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    {...register(field.name)}
                    aria-invalid={!!errors[field.name]}
                  />
                ) : field.type === 'select' ? (
                  <Controller
                    control={control}
                    name={field.name}
                    render={({ field: selectField }) => (
                      <Select
                        value={
                          selectField.value !== undefined && selectField.value !== null
                            ? String(selectField.value)
                            : ''
                        }
                        onValueChange={(val) =>
                          selectField.onChange(val === '' || val === 'NONE' ? null : Number(val))
                        }
                      >
                        <SelectTrigger id={field.name} aria-invalid={!!errors[field.name]}>
                          <SelectValue
                            placeholder={
                              field.placeholder ?? `Pilih ${field.label.toLowerCase()}…`
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {field.options?.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    {...register(field.name, {
                      valueAsNumber: field.type === 'number',
                    })}
                    aria-invalid={!!errors[field.name]}
                  />
                )}
                {field.hint && (
                  <p className="text-xs text-muted-foreground">{field.hint}</p>
                )}
                {errors[field.name] && (
                  <p className="text-xs text-destructive">
                    {errors[field.name]?.message as string}
                  </p>
                )}
              </div>
            ))}

            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingItem(null);
                }}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Menyimpan...'
                  : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
        title={`Hapus ${title}`}
        description={deleteMessage}
        confirmText="Hapus"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => {
          if (deletingItem) {
            deleteMutation.mutate(deletingItem.id);
          }
        }}
      />
    </div>
  );
}
