'use client';

import { useEffect, useState } from 'react';

type ProbeState =
  | { status: 'loading' }
  | { status: 'success'; user: unknown }
  | { status: 'error'; message: string };

export default function ProxyProbe() {
  const [probe, setProbe] = useState<ProbeState>({ status: 'loading' });

  useEffect(() => {
    let active = true;

    async function run() {
      try {
        const response = await fetch('/api/proxy/me');
        const payload = (await response.json()) as {
          success: boolean;
          message: string;
          data: unknown;
        };

        if (!active) return;

        if (response.ok && payload.success) {
          setProbe({ status: 'success', user: payload.data });
        } else {
          setProbe({ status: 'error', message: payload.message });
        }
      } catch {
        if (active) {
          setProbe({ status: 'error', message: 'Gagal mengambil data via proxy.' });
        }
      }
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="rounded-lg border border-zinc-300 bg-zinc-50 p-4">
      <h2 className="text-sm font-semibold text-zinc-900">Proxy Probe</h2>
      <p className="mt-1 text-xs text-zinc-600">
        Data berikut diambil dari <code>/api/proxy/me</code> (token di-attach di server).
      </p>

      {probe.status === 'loading' && (
        <p className="mt-3 text-sm text-zinc-500">Memuat…</p>
      )}

      {probe.status === 'error' && (
        <p className="mt-3 text-sm text-red-700">{probe.message}</p>
      )}

      {probe.status === 'success' && (
        <pre className="mt-3 overflow-x-auto rounded bg-zinc-100 p-3 text-xs text-zinc-800">
          {JSON.stringify(probe.user, null, 2)}
        </pre>
      )}
    </section>
  );
}
