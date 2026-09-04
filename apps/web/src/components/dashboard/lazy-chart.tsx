import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function lazyChart<P extends object, T extends ComponentType<P>>(
  loader: () => Promise<{ default: T }>
) {
  return dynamic(loader, {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center">
        <Skeleton className="h-56 w-full" />
      </div>
    ),
  });
}
