import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PaginationMeta } from '@/types/api';

interface DataTablePaginationProps {
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
}

export function DataTablePagination({
  meta,
  onPageChange,
  onPerPageChange,
}: DataTablePaginationProps) {
  if (!meta) {
    return null;
  }

  const { current_page, last_page, per_page, total, from, to } = meta;

  return (
    <div className="flex flex-col items-center justify-between gap-4 py-3 sm:flex-row sm:gap-6">
      {/* Range Info */}
      <div className="text-muted-foreground text-xs">
        {total > 0 ? (
          <span>
            Menampilkan <strong className="text-foreground">{from}</strong> -{' '}
            <strong className="text-foreground">{to}</strong> dari{' '}
            <strong className="text-foreground">{total}</strong> data
          </span>
        ) : (
          <span>0 data</span>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
        {/* Page Size selector */}
        {onPerPageChange && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground text-xs">Baris per hal:</span>
            <Select
              value={String(per_page)}
              onValueChange={(val) => onPerPageChange(Number(val))}
            >
              <SelectTrigger className="h-11 sm:h-8 min-h-[44px] sm:min-h-0 w-[78px] sm:w-[70px] rounded-lg text-xs">
                <SelectValue placeholder={String(per_page)} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 25, 50].map((size) => (
                  <SelectItem key={size} value={String(size)} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Page Number & Navigation Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg"
            onClick={() => onPageChange(1)}
            disabled={current_page <= 1}
            aria-label="Ke halaman pertama"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg"
            onClick={() => onPageChange(current_page - 1)}
            disabled={current_page <= 1}
            aria-label="Ke halaman sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <span className="px-2 text-foreground text-xs font-medium">
            Hal {current_page} dari {last_page || 1}
          </span>

          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg"
            onClick={() => onPageChange(current_page + 1)}
            disabled={current_page >= last_page}
            aria-label="Ke halaman selanjutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 sm:h-8 sm:w-8 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 rounded-lg"
            onClick={() => onPageChange(last_page)}
            disabled={current_page >= last_page}
            aria-label="Ke halaman terakhir"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
