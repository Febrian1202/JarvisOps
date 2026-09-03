import React from 'react';
import { AppSidebar } from '@/components/shell/app-sidebar';
import { AppTopbar } from '@/components/shell/app-topbar';
import { AuthProvider } from '@/components/providers/auth-provider';
import { QueryProvider } from '@/components/providers/query-provider';
import { Toaster } from '@/components/ui/sonner';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <QueryProvider>
      <AuthProvider>
        <div className="flex min-h-screen bg-background text-foreground">
          <AppSidebar />
          <div className="flex flex-1 flex-col md:pl-64">
            <AppTopbar />
            <main className="mx-auto flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full">
              {children}
            </main>
          </div>
        </div>
        <Toaster />
      </AuthProvider>
    </QueryProvider>
  );
}
