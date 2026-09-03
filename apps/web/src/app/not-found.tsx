import React from 'react';
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="max-w-md border-border bg-card text-center shadow-sm">
        <CardHeader className="flex flex-col items-center space-y-2 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <FileQuestion className="h-6 w-6" />
          </div>
          <CardTitle className="font-bold text-xl">404 — Halaman Tidak Ditemukan</CardTitle>
          <CardDescription>
            Halaman atau data yang Anda cari tidak tersedia atau tautan telah
            berubah.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Button asChild className="w-full">
            <Link href="/">Kembali ke Halaman Utama</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
