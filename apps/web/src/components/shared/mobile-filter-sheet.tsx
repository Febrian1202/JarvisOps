'use client';

import React, { useState } from 'react';
import { SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { FilterField } from '@/components/shared/filter-bar';

interface MobileFilterSheetProps {
  filters: FilterField[];
  onFilterChange?: (filterId: string, value: string) => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function MobileFilterSheet({
  filters,
  onFilterChange,
  onResetFilters,
  hasActiveFilters = false,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  const activeCount = filters.filter((f) => Boolean(f.value && f.value !== 'ALL')).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative min-h-[44px] h-11 px-3 text-xs font-medium border-border bg-card flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span>Filter</span>
          {activeCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 px-1.5 min-w-[20px] rounded-full text-[10px] font-semibold bg-primary text-primary-foreground"
            >
              {activeCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="space-y-4 pb-6">
        <SheetHeader className="text-left border-b border-border pb-3">
          <SheetTitle className="text-base font-semibold">Filter Data</SheetTitle>
          <SheetDescription className="text-xs text-muted-foreground">
            Sesuaikan parameter untuk memfilter daftar.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-2">
          {filters.map((filter) => (
            <div key={filter.id} className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                {filter.label}
              </label>
              <Select
                value={filter.value || 'ALL'}
                onValueChange={(val) => {
                  if (onFilterChange) {
                    onFilterChange(filter.id, val === 'ALL' ? '' : val);
                  }
                }}
              >
                <SelectTrigger className="h-11 min-h-[44px] w-full rounded-lg text-sm border-border bg-card">
                  <SelectValue placeholder={filter.label} />
                </SelectTrigger>
                <SelectContent className="z-50">
                  <SelectItem value="ALL" className="text-sm py-2.5">
                    Semua {filter.label}
                  </SelectItem>
                  {filter.options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-sm py-2.5">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        <SheetFooter className="pt-2 flex flex-row gap-2 sm:justify-end">
          {hasActiveFilters && onResetFilters && (
            <Button
              variant="outline"
              onClick={() => {
                onResetFilters();
              }}
              className="flex-1 min-h-[44px] h-11 text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </Button>
          )}
          <Button
            variant="default"
            onClick={() => setOpen(false)}
            className="flex-1 min-h-[44px] h-11 text-xs gap-1.5"
          >
            <Check className="h-4 w-4" />
            Tutup
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
