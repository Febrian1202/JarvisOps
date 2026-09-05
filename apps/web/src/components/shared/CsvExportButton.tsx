'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';
import { useAuth } from '@/components/providers/auth-provider';

export interface CsvExportButtonProps {
  entity: 'tickets' | 'assets' | 'audit-logs';
  label?: string;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  className?: string;
}

export function CsvExportButton({
  entity,
  label = 'Ekspor CSV',
  size = 'sm',
  variant = 'outline',
  className,
}: CsvExportButtonProps) {
  const { can, hasRole } = useAuth();
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);

  // Authorization check
  const isAllowed = React.useMemo(() => {
    if (entity === 'tickets') {
      // Employee cannot export tickets globally
      if (hasRole('employee')) {
        return false;
      }
      return can('ticket.viewAny');
    }

    if (entity === 'assets') {
      return can('asset.viewAny');
    }

    if (entity === 'audit-logs') {
      return can('audit-log.viewAny');
    }

    return false;
  }, [entity, can, hasRole]);

  if (!isAllowed) {
    return null;
  }

  const handleExport = async () => {
    try {
      setIsExporting(true);

      const queryString = searchParams?.toString() ?? '';
      const url = `/api/proxy/export/${entity}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Accept: 'text/csv',
        },
      });

      if (!response.ok) {
        let errorMessage = 'Gagal mengekspor data CSV.';
        try {
          const json = await response.json();
          if (json.message) {
            errorMessage = json.message;
          }
        } catch {
          // ignore non-json error responses
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `${entity}-export.csv`;

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match?.[1]) {
          filename = match[1];
        }
      }

      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      toast.success('File CSV berhasil diunduh.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengekspor data.';
      toast.error(message);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={handleExport}
      disabled={isExporting}
      className={className}
      aria-label={`Ekspor ${entity} format CSV`}
    >
      {isExporting ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : (
        <Download className="h-4 w-4 text-muted-foreground" />
      )}
      <span>{label}</span>
    </Button>
  );
}
