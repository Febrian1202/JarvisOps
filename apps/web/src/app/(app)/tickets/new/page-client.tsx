'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TicketForm } from '@/components/tickets/TicketForm';

export function CreateTicketPageClient() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8">
            <Link href="/tickets" aria-label="Kembali ke daftar tiket">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <h1 className="font-bold text-xl text-foreground tracking-tight">
            Buat Tiket Permohonan Baru
          </h1>
        </div>
        <p className="text-muted-foreground text-xs sm:text-sm pl-10">
          Laporkan kendala teknis atau permohonan perangkat kerja IT Anda kepada tim teknis.
        </p>
      </div>

      {/* 2-Column Form */}
      <TicketForm />
    </div>
  );
}
