'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Lock, AlertCircle } from 'lucide-react';
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

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Kata sandi saat ini wajib diisi.'),
    password: z.string().min(8, 'Kata sandi baru minimal 8 karakter.'),
    password_confirmation: z
      .string()
      .min(1, 'Konfirmasi kata sandi baru wajib diisi.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Konfirmasi kata sandi baru tidak cocok.',
    path: ['password_confirmation'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

export default function GantiPasswordPage() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      current_password: '',
      password: '',
      password_confirmation: '',
    },
  });

  async function onSubmit(values: ChangePasswordFormValues) {
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
                        type="password"
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={loading}
                        className="h-[42px] rounded-md bg-background pl-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
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
                        type="password"
                        placeholder="Minimal 8 karakter"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-[42px] rounded-md bg-background pl-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
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
                        type="password"
                        placeholder="Ulangi kata sandi baru"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-[42px] rounded-md bg-background pl-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
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
