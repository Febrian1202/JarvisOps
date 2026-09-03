'use client';

import React, { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  delay?: number;
  className?: string;
}

export function SearchInput({
  value: initialValue = '',
  onChange,
  placeholder = 'Cari data…',
  delay = 300,
  className,
}: SearchInputProps) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearch = useDebounce(searchTerm, delay);

  useEffect(() => {
    setSearchTerm(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (debouncedSearch !== initialValue) {
      onChange(debouncedSearch);
    }
  }, [debouncedSearch, onChange, initialValue]);

  return (
    <div className={cn('relative flex items-center w-full max-w-xs', className)}>
      <Search className="absolute left-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8 pr-8 rounded-[var(--radius)] text-xs border-border bg-card"
        aria-label={placeholder}
      />
      {searchTerm && (
        <button
          type="button"
          onClick={() => {
            setSearchTerm('');
            onChange('');
          }}
          className="absolute right-2.5 text-muted-foreground hover:text-foreground"
          aria-label="Hapus teks pencarian"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
