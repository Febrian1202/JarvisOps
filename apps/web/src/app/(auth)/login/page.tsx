'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
import { translateValidationError } from '@/lib/client/error-mapper';
import type { ApiResponse, ApiError, AuthUser } from '@/types/api';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginFormValues) {
    setGeneralError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });

      const payload = (await response.json()) as
        | ApiResponse<{ user: AuthUser }>
        | ApiError;

      if (!response.ok || !payload.success) {
        const errorPayload = payload as ApiError;
        if (errorPayload.errors) {
          const firstError = Object.values(errorPayload.errors)[0]?.[0];
          setGeneralError(
            firstError
              ? translateValidationError(firstError)
              : errorPayload.message
          );
        } else {
          setGeneralError(
            errorPayload.message
              ? translateValidationError(errorPayload.message)
              : 'Email atau kata sandi salah.'
          );
        }
        return;
      }

      const userData = (payload as ApiResponse<{ user: AuthUser }>).data?.user;
      if (userData?.must_change_password) {
        router.push('/ganti-password');
      } else {
        router.push('/');
      }
    } catch {
      setGeneralError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitShell
      headline="Satu tempat untuk seluruh permintaan IT perusahaan."
      subhead="Lapor, tangani, dan pantau SLA tanpa kehilangan jejak."
      noticeTitle="Sistem internal"
      noticeBody="Tidak ada pendaftaran mandiri. Akun dibuat oleh Administrator."
      fieldNote="Akun tidak aktif tidak dapat masuk. Hubungi Administrator."
      cardWidthClass="max-w-[400px]"
    >
      <div className="rounded-xl border border-border bg-card p-8 shadow-xs">
        <h2 className="text-[22px] font-semibold tracking-tight text-foreground">
          Masuk
        </h2>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-xs font-medium text-foreground">
                    Email
                  </FormLabel>
                  <div className="relative flex items-center">
                    <Mail
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground"
                    />
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="nama@perusahaan.co.id"
                        autoComplete="email"
                        disabled={loading}
                        className="h-10.5 rounded-md bg-background pl-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
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
                    Kata Sandi
                  </FormLabel>
                  <div className="relative flex items-center">
                    <Lock
                      aria-hidden="true"
                      className="pointer-events-none absolute left-3.5 h-4 w-4 text-muted-foreground"
                    />
                    <FormControl>
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={loading}
                        className="h-10.5 rounded-md bg-background pl-10 pr-10 text-sm placeholder:text-muted-foreground focus-visible:ring-ring focus-visible:ring-offset-0"
                        {...field}
                      />
                    </FormControl>
                    <button
                      type="button"
                      aria-label={
                        showPassword
                          ? 'Sembunyikan kata sandi'
                          : 'Tampilkan kata sandi'
                      }
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3.5 flex h-5 w-5 items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-sm"
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

            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-md bg-primary text-sm font-semibold text-primary-foreground shadow-[rgba(255,255,255,0.2)_0px_0.5px_0px_0px_inset,rgba(0,0,0,0.2)_0px_0px_0px_0.5px_inset] transition-opacity hover:opacity-90 active:opacity-80"
            >
              {loading ? 'Memproses…' : 'Masuk'}
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
