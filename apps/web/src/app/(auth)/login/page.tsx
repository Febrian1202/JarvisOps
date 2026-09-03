'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiResponse, ApiError, AuthUser } from '@/types/api';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.'),
  password: z
    .string()
    .min(1, 'Password wajib diisi.'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
          setGeneralError(firstError ?? errorPayload.message);
        } else {
          setGeneralError(errorPayload.message ?? 'Email atau password salah.');
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
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-semibold text-xl">Masuk ke Akun</CardTitle>
        <CardDescription>
          Masukkan kredensial akun Anda untuk mengakses sistem.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {generalError && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-destructive/10 p-3 text-destructive text-sm"
          >
            {generalError}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="nama@perusahaan.com"
                      autoComplete="email"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="current-password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Memproses…' : 'Masuk'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
