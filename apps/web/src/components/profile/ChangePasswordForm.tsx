'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/client/api';
import { useApiMutation } from '@/hooks/useApiMutation';
import { setFormErrors } from '@/lib/client/error-mapper';
import { changePasswordSchema, type ChangePasswordFormData } from '@/schemas/profile';

export function ChangePasswordForm() {
  const router = useRouter();
  const [successState, setSuccessState] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  const mutation = useApiMutation<ChangePasswordFormData, null>({
    mutationFn: (data) =>
      apiFetch<null>('/me/password', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccessMessage: 'Password berhasil diperbarui.',
    onFormError: (backendErrors) => {
      // Map English "The current password is incorrect." to Indonesian if present
      const mappedErrors: Record<string, string[]> = { ...backendErrors };
      if (mappedErrors.current_password) {
        mappedErrors.current_password = mappedErrors.current_password.map((msg) =>
          msg.toLowerCase().includes('incorrect')
            ? 'Password saat ini tidak sesuai.'
            : msg
        );
      }
      setFormErrors(mappedErrors, setError);
    },
    onSuccess: () => {
      setSuccessState(true);
      reset();
    },
  });

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      router.replace('/login');
    }
  };

  const onSubmit = handleSubmit((values) => {
    setSuccessState(false);
    mutation.mutate(values);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {successState && (
        <div className="rounded-xl border border-[#d9e5d4] bg-[#eaf0e6] p-4 text-xs space-y-2.5">
          <div className="flex items-center gap-2 text-[#4d663e] font-semibold">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>Password Anda telah berhasil diperbarui.</span>
          </div>
          <p className="text-muted-foreground">
            Sesi aktif di perangkat lain telah dicabut. Untuk memastikan keamanan
            akun, Anda disarankan untuk masuk kembali dengan password baru.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="gap-1.5 bg-background border-border text-xs h-8"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>{isLoggingOut ? 'Keluar sesi…' : 'Keluar Sesi Sekarang'}</span>
          </Button>
        </div>
      )}

      {/* Current Password */}
      <div className="space-y-1.5">
        <Label htmlFor="current_password">
          Password Saat Ini <span className="text-destructive">*</span>
        </Label>
        <Input
          id="current_password"
          type="password"
          placeholder="Masukkan password saat ini"
          {...register('current_password')}
          aria-invalid={!!errors.current_password}
        />
        {errors.current_password && (
          <p className="text-xs text-destructive">
            {errors.current_password.message}
          </p>
        )}
      </div>

      {/* New Password */}
      <div className="space-y-1.5">
        <Label htmlFor="new_password">
          Password Baru <span className="text-destructive">*</span>
        </Label>
        <Input
          id="new_password"
          type="password"
          placeholder="Minimal 8 karakter, kombinasi huruf & angka"
          {...register('password')}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      {/* Password Confirmation */}
      <div className="space-y-1.5">
        <Label htmlFor="password_confirmation">
          Konfirmasi Password Baru <span className="text-destructive">*</span>
        </Label>
        <Input
          id="password_confirmation"
          type="password"
          placeholder="Ulangi password baru Anda"
          {...register('password_confirmation')}
          aria-invalid={!!errors.password_confirmation}
        />
        {errors.password_confirmation && (
          <p className="text-xs text-destructive">
            {errors.password_confirmation.message}
          </p>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="min-w-[140px]"
        >
          {mutation.isPending ? 'Memperbarui…' : 'Perbarui Password'}
        </Button>
      </div>
    </form>
  );
}
