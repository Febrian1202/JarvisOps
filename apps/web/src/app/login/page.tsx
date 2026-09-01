'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import type { ApiError, ApiResponse, User } from '@/types/api';

interface LoginData {
  user: User;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const payload = (await response.json()) as ApiResponse<LoginData> | ApiError;

      if (!response.ok || !payload.success) {
        const firstError = Object.values((payload as ApiError).errors ?? {})[0]?.[0];
        setError(firstError ?? payload.message);
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Tidak dapat terhubung ke server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm rounded-lg border border-zinc-300 bg-zinc-50 p-6 shadow-sm">
        <h1 className="text-xl font-semibold text-zinc-900">Masuk</h1>
        <p className="mt-1 text-sm text-zinc-600">Masuk untuk mengakses dashboard.</p>

        {error && (
          <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
            Password
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="rounded border border-zinc-300 bg-zinc-100 px-3 py-2 text-zinc-900 outline-none focus:border-zinc-500"
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="rounded bg-zinc-900 px-3 py-2 text-sm font-medium text-zinc-50 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  );
}
