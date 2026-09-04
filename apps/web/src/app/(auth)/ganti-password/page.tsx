'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { AuthSplitShell } from '@/components/auth/auth-split-shell';
import { apiFetch, ApiClientError } from '@/lib/client/api';
import { setFormErrors } from '@/lib/client/error-mapper';
import {
  changePasswordSchema,
  type ChangePasswordFormData,
} from '@/schemas/profile';

export default function GantiPasswordPage() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  async function onSubmit(values: ChangePasswordFormData) {
    setGeneralError(null);
    setLoading(true);

    try {
      await apiFetch<null>('/me/password', {
        method: 'PUT',
        body: JSON.stringify(values),
      });

      router.push('/');
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.errors) {
          setFormErrors(err.errors, form.setError);
        } else {
          setGeneralError(err.message);
        }
      } else {
        setGeneralError('Gagal memperbarui kata sandi. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitShell
      headline="Pembaruan Kata Sandi Wajib"
      subhead="Akun Anda baru saja diatur ulang oleh Administrator. Demi keamanan, Anda wajib membuat kata sandi baru sebelum dapat mengakses sistem."
      noticeTitle="Ketentuan Kata Sandi"
      noticeBody="Minimal 8 karakter, kombinasi huruf dan angka. Jangan gunakan kata sandi lama."
      cardWidthClass="max-w-[420px]"
    >
      <div className="rounded-[10px] border border-border bg-card p-8 shadow-xs">
        <h2 className="text-[20px] font-semibold tracking-tight text-foreground">
          Buat Kata Sandi Baru
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <FormField
              control={form.control}
              name="current_password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">
                    Kata Sandi Saat Ini / Sementara
                  </FormLabel>
                  <div className="relative flex items-center">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground"
                    />
                    <FormControl>
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={loading}
                        className="h-[42px] rounded-md bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      aria-label={
                        showCurrentPassword
                          ? 'Sembunyikan kata sandi saat ini'
                          : 'Tampilkan kata sandi saat ini'
                      }
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3.5 flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      {showCurrentPassword ? (
                        <EyeOff aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">
                    Kata Sandi Baru
                  </FormLabel>
                  <div className="relative flex items-center">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground"
                    />
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimal 8 karakter, kombinasi huruf & angka"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-[42px] rounded-md bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? 'Sembunyikan kata sandi baru'
                          : 'Tampilkan kata sandi baru'
                      }
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password_confirmation"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">
                    Konfirmasi Kata Sandi Baru
                  </FormLabel>
                  <div className="relative flex items-center">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground"
                    />
                    <FormControl>
                      <Input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Ulangi kata sandi baru"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-[42px] rounded-md bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      aria-label={
                        showConfirmPassword
                          ? 'Sembunyikan konfirmasi kata sandi'
                          : 'Tampilkan konfirmasi kata sandi'
                      }
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3.5 flex h-5 w-5 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    >
                      {showConfirmPassword ? (
                        <EyeOff aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Eye aria-hidden="true" className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-[rgba(255,255,255,0.2)_0px_0.5px_0px_0px_inset,rgba(0,0,0,0.2)_0px_0px_0px_0.5px_inset] transition-opacity hover:opacity-90 active:opacity-80"
            >
              {loading ? 'Menyimpan…' : 'Simpan & Lanjutkan ke Sistem'}
            </Button>

            {generalError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs leading-relaxed text-destructive"
              >
                <AlertCircle
                  aria-hidden="true"
                  className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                />
                <span>{generalError}</span>
              </div>
            )}
          </form>
        </Form>
      </div>
    </AuthSplitShell>
  );
}
