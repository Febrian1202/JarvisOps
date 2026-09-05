'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/client/api';
import { useApiMutation } from '@/hooks/useApiMutation';
import { setFormErrors } from '@/lib/client/error-mapper';
import { getRoleLabel } from '@/lib/labels';
import { profileSchema, type ProfileFormData } from '@/schemas/profile';
import type { AuthUser } from '@/types/auth';

interface ProfileFormProps {
  user: AuthUser;
}

export function ProfileForm({ user }: ProfileFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user.full_name,
      phone: user.profile?.phone ?? '',
    },
  });

  const mutation = useApiMutation<{ full_name: string; phone: string | null }, AuthUser>({
    mutationFn: (data) =>
      apiFetch<AuthUser>('/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: 'Profil berhasil diperbarui.',
    invalidateKeys: [['me']],
    onFormError: (backendErrors) => {
      setFormErrors(backendErrors, setError);
    },
  });

  const onSubmit = handleSubmit((values) => {
    mutation.mutate({
      full_name: values.full_name,
      phone: values.phone || null,
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Full Name */}
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="full_name">
            Nama Lengkap <span className="text-destructive">*</span>
          </Label>
          <Input
            id="full_name"
            placeholder="Nama lengkap Anda"
            {...register('full_name')}
            aria-invalid={!!errors.full_name}
            className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
          />
          {errors.full_name && (
            <p className="text-xs text-destructive">{errors.full_name.message}</p>
          )}
        </div>

        {/* Email (Readonly) */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-muted-foreground">
            Alamat Email <span className="text-[10px]">(Tidak dapat diubah)</span>
          </Label>
          <Input
            id="email"
            value={user.email}
            readOnly
            disabled
            className="bg-muted/50 text-muted-foreground cursor-not-allowed h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
          />
        </div>

        {/* Phone */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">Nomor Telepon / WhatsApp</Label>
          <Input
            id="phone"
            placeholder="Contoh: 081234567890"
            {...register('phone')}
            aria-invalid={!!errors.phone}
            className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
          />
          {errors.phone && (
            <p className="text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>

        {/* Role & Department (Readonly info) */}
        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Peran Pengguna</Label>
          <div className="h-9 flex items-center">
            <Badge variant="outline" className="text-xs font-semibold px-2.5 py-0.5">
              {getRoleLabel(user.role?.name ?? '')}
            </Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-muted-foreground">Departemen</Label>
          <div className="h-9 flex items-center text-sm font-medium text-foreground">
            {user.department?.name ?? '—'}
          </div>
        </div>

        {/* Employee Code */}
        {user.profile?.employee_code && (
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Kode Karyawan</Label>
            <div className="h-9 flex items-center font-mono text-sm text-foreground">
              {user.profile.employee_code}
            </div>
          </div>
        )}

        {/* Position */}
        {user.profile?.position && (
          <div className="space-y-1.5">
            <Label className="text-muted-foreground">Jabatan</Label>
            <div className="h-9 flex items-center text-sm text-foreground">
              {user.profile.position}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending || !isDirty}
          className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 w-full sm:w-auto min-w-[120px]"
        >
          {mutation.isPending ? 'Menyimpan…' : 'Simpan Profil'}
        </Button>
      </div>
    </form>
  );
}
