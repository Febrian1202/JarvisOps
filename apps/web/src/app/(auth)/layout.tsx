import React from 'react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-1 text-center">
          <div className="inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius)] bg-primary font-bold text-primary-foreground text-sm shadow-sm">
              JO
            </span>
            <h1 className="font-bold text-2xl text-foreground tracking-tight">
              JARVIS OPS
            </h1>
          </div>
          <p className="text-muted-foreground text-sm">
            IT Service Management System
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}
