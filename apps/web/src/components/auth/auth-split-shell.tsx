import React from 'react';
import { cn } from '@/lib/utils';

export interface AuthSplitShellProps {
  headline: string;
  subhead: string;
  noticeTitle: string;
  noticeBody: string;
  children: React.ReactNode;
  fieldNote?: string;
  cardWidthClass?: string;
}

export function AuthSplitShell({
  headline,
  subhead,
  noticeTitle,
  noticeBody,
  children,
  fieldNote,
  cardWidthClass = 'max-w-[400px]',
}: AuthSplitShellProps) {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground lg:flex-row">
      {/* Sisi Kiri: Brand Panel (desktop 560px, collapsible on mobile) */}
      <aside
        aria-label="Informasi Sistem"
        className="flex w-full flex-col justify-between border-b border-border bg-secondary/40 p-6 sm:p-8 lg:w-[560px] lg:shrink-0 lg:border-r lg:border-b-0 lg:p-14"
      >
        {/* Atas: Lockup */}
        <div className="inline-flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-xs select-none"
          >
            JO
          </span>
          <span className="text-[15px] font-semibold tracking-wider text-foreground">
            JARVIS OPS
          </span>
        </div>

        {/* Tengah: Statement */}
        <div className="my-8 space-y-4 lg:my-0 lg:space-y-4.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl lg:text-[30px] lg:leading-[1.25]">
            {headline}
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base lg:text-[14px]">
            {subhead}
          </p>
        </div>

        {/* Bawah: Notice Box */}
        <div
          role="note"
          className="rounded-lg border border-border bg-card p-4 shadow-xs"
        >
          <p className="text-xs font-semibold text-foreground">{noticeTitle}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {noticeBody}
          </p>
        </div>
      </aside>

      {/* Sisi Kanan: Form Column */}
      <main className="flex flex-1 flex-col items-center justify-center p-6 sm:p-8 lg:p-14">
        <div className={cn('w-full', cardWidthClass)}>
          {children}

          {fieldNote && (
            <p className="mt-4 text-center text-xs leading-normal text-muted-foreground">
              {fieldNote}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
