import React from 'react';
import Link from 'next/link';
import { ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="max-w-md border-border bg-card text-center shadow-sm">
        <CardHeader className="flex flex-col items-center space-y-2 p-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldX className="h-6 w-6" />
          </div>
          <CardTitle className="font-bold text-xl">403 — Akses Ditolak</CardTitle>
          <CardDescription>
            Anda tidak memiliki izin (permission) yang cukup untuk mengakses
            halaman ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <Button asChild className="w-full">
            <Link href="/">Kembali ke Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
