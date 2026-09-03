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
import { apiFetch, ApiClientError } from '@/lib/client/api';
import { setFormErrors } from '@/lib/client/error-mapper';

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Password saat ini wajib diisi.'),
    password: z.string().min(8, 'Password baru minimal 8 karakter.'),
    password_confirmation: z.string().min(1, 'Konfirmasi password wajib diisi.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Konfirmasi password tidak cocok.',
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
        setGeneralError('Gagal memperbarui password. Silakan coba lagi.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-border bg-card shadow-sm">
      <CardHeader className="space-y-1">
        <CardTitle className="font-semibold text-xl">
          Perbarui Password Anda
        </CardTitle>
        <CardDescription>
          Untuk alasan keamanan, Anda wajib mengubah password sementara sebelum
          melanjutkan ke sistem.
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
              name="current_password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Saat Ini</FormLabel>
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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password Baru</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Minimal 8 karakter"
                      autoComplete="new-password"
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
              name="password_confirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Konfirmasi Password Baru</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Ulangi password baru"
                      autoComplete="new-password"
                      disabled={loading}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Menyimpan…' : 'Simpan & Masuk'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
