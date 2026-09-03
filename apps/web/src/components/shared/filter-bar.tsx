'use client';

import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from '@/components/shared/search-input';

export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterField {
  id: string;
  label: string;
  options: FilterOption[];
  value?: string;
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
  filters?: FilterField[];
  onFilterChange?: (filterId: string, value: string) => void;
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
  children?: React.ReactNode;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = 'Cari…',
  filters = [],
  onFilterChange,
  onResetFilters,
  hasActiveFilters = false,
  children,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Search & Filter Dropdowns */}
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <SearchInput
            value={search}
            onChange={onSearchChange}
            placeholder={searchPlaceholder}
          />
        )}

        {filters.map((filter) => (
          <div key={filter.id} className="min-w-[140px]">
            <Select
              value={filter.value || 'ALL'}
              onValueChange={(val) => {
                if (onFilterChange) {
                  onFilterChange(filter.id, val === 'ALL' ? '' : val);
                }
              }}
            >
              <SelectTrigger className="h-9 rounded-lg text-xs border-border bg-card">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">
                  Semua {filter.label}
                </SelectItem>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}

        {hasActiveFilters && onResetFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetFilters}
            className="h-9 px-2.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      {/* Right: Actions / Buttons */}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
