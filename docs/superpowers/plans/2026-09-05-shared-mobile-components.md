# Sub-tahap 11a — Shared Mobile Components & View Adapter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build responsive mobile shared foundation components: SSR-safe `useMediaQuery` & `useIsMobile` hooks, generic responsive card view adapter for `DataTable`, reusable Radix UI `Sheet` primitive, and `MobileFilterSheet` integration in `FilterBar`.

**Architecture:** Pure CSS responsive display pattern (`hidden sm:block` vs `block sm:hidden`) to avoid hydration flicker in Next.js 16/React 19, paired with `useSyncExternalStore` for media queries and Radix Dialog for bottom sheets.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4, `@radix-ui/react-dialog`, Vitest 4, `@testing-library/react`.

**Spec:** docs/tasks/phase-11/11a-shared-mobile-components.md

## Global Constraints
- Branch: `feat/phase-11a-shared-mobile`
- Zero hydration mismatch: prefer CSS utility classes over client-only conditional rendering for initial layout.
- Touch target size: minimum 44×44px hit-box for mobile interactive elements (WCAG 2.2 AA).
- Conventional commits: `feat(web): ...` / `test(web): ...`.
- All Vitest unit tests in `apps/web/src/test/` must pass cleanly.

---

### Task 1: SSR-Safe `useMediaQuery` & `useIsMobile` Hooks

**Files:**
- Create: `apps/web/src/hooks/use-media-query.ts`
- Test: `apps/web/src/test/use-media-query.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export function useMediaQuery(query: string, defaultValue?: boolean): boolean;
  export function useIsMobile(): boolean;
  ```

- [ ] **Step 1: Write failing test for `useMediaQuery` and `useIsMobile`**

```ts
// apps/web/src/test/use-media-query.test.ts
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useMediaQuery, useIsMobile } from '@/hooks/use-media-query';

describe('useMediaQuery & useIsMobile', () => {
  let listeners: Array<(e: MediaQueryListEvent) => void> = [];
  let matchesValue = false;

  beforeEach(() => {
    listeners = [];
    matchesValue = false;

    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: matchesValue,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
        if (event === 'change') listeners.push(cb);
      }),
      removeEventListener: vi.fn((event: string, cb: (e: MediaQueryListEvent) => void) => {
        listeners = listeners.filter((l) => l !== cb);
      }),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false by default or custom fallback when matchMedia is not supported', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)', false));
    expect(result.current).toBe(false);

    const { result: resultFallback } = renderHook(() => useMediaQuery('(max-width: 639px)', true));
    expect(resultFallback.current).toBe(true);
  });

  it('returns initial matchMedia value', () => {
    matchesValue = true;
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'));
    expect(result.current).toBe(true);
  });

  it('reacts to matchMedia change events', () => {
    matchesValue = false;
    const { result } = renderHook(() => useMediaQuery('(max-width: 639px)'));
    expect(result.current).toBe(false);

    act(() => {
      matchesValue = true;
      listeners.forEach((listener) => listener({ matches: true } as MediaQueryListEvent));
    });

    expect(result.current).toBe(true);
  });

  it('useIsMobile uses (max-width: 639px)', () => {
    matchesValue = true;
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(max-width: 639px)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/test/use-media-query.test.ts --prefix apps/web`
Expected: FAIL (Cannot find module `@/hooks/use-media-query`)

- [ ] **Step 3: Implement `useMediaQuery` and `useIsMobile`**

```ts
// apps/web/src/hooks/use-media-query.ts
'use client';

import { useSyncExternalStore, useCallback } from 'react';

export function useMediaQuery(query: string, defaultValue = false): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      if (typeof window === 'undefined' || !window.matchMedia) {
        return () => {};
      }

      const matchMedia = window.matchMedia(query);
      matchMedia.addEventListener('change', callback);

      return () => {
        matchMedia.removeEventListener('change', callback);
      };
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return defaultValue;
    }
    return window.matchMedia(query).matches;
  }, [query, defaultValue]);

  const getServerSnapshot = useCallback(() => defaultValue, [defaultValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 639px)');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test src/test/use-media-query.test.ts --prefix apps/web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-media-query.ts apps/web/src/test/use-media-query.test.ts
git commit -m "feat(web): add SSR-safe useMediaQuery and useIsMobile hooks"
```

---

### Task 2: Radix UI `Sheet` Primitive Component

**Files:**
- Create: `apps/web/src/components/ui/sheet.tsx`
- Test: `apps/web/src/test/sheet.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export {
    Sheet,
    SheetTrigger,
    SheetClose,
    SheetPortal,
    SheetOverlay,
    SheetContent,
    SheetHeader,
    SheetFooter,
    SheetTitle,
    SheetDescription,
  };
  ```

- [ ] **Step 1: Write test for `Sheet` primitive with `side="bottom"`**

```tsx
// apps/web/src/test/sheet.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

describe('Sheet Component', () => {
  it('opens sheet content on trigger click', async () => {
    const user = userEvent.setup();
    render(
      <Sheet>
        <SheetTrigger asChild>
          <button>Buka Sheet</button>
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>Judul Sheet</SheetTitle>
            <SheetDescription>Deskripsi Sheet</SheetDescription>
          </SheetHeader>
          <div>Konten Utama</div>
        </SheetContent>
      </Sheet>
    );

    expect(screen.queryByText('Judul Sheet')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Buka Sheet' }));

    expect(screen.getByText('Judul Sheet')).toBeInTheDocument();
    expect(screen.getByText('Konten Utama')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/test/sheet.test.tsx --prefix apps/web`
Expected: FAIL (Cannot find module `@/components/ui/sheet`)

- [ ] **Step 3: Implement `apps/web/src/components/ui/sheet.tsx`**

```tsx
// apps/web/src/components/ui/sheet.tsx
'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sheet = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose = DialogPrimitive.Close;
const SheetPortal = DialogPrimitive.Portal;

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName;

const sheetVariants = cva(
  'fixed z-50 gap-4 bg-card p-6 shadow-xl transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-400',
  {
    variants: {
      side: {
        top: 'inset-x-0 top-0 border-b border-border data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
        bottom:
          'inset-x-0 bottom-0 border-t border-border rounded-t-2xl max-h-[85vh] overflow-y-auto data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
        left: 'inset-y-0 left-0 h-full w-3/4 border-r border-border data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm',
        right:
          'inset-y-0 right-0 h-full w-3/4 border-l border-border data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm',
      },
    },
    defaultVariants: {
      side: 'right',
    },
  }
);

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  SheetContentProps
>(({ side = 'right', className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Tutup</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = DialogPrimitive.Content.displayName;

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-2 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
SheetHeader.displayName = 'SheetHeader';

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
SheetFooter.displayName = 'SheetFooter';

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold text-foreground', className)}
    {...props}
  />
));
SheetTitle.displayName = DialogPrimitive.Title.displayName;

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
SheetDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test src/test/sheet.test.tsx --prefix apps/web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/ui/sheet.tsx apps/web/src/test/sheet.test.tsx
git commit -m "feat(web): add reusable Sheet UI primitive with side variants"
```

---

### Task 3: Responsive Card View Adapter di `DataTable`

**Files:**
- Modify: `apps/web/src/components/shared/data-table/data-table.tsx`
- Modify: `apps/web/src/test/data-table.test.tsx`

**Interfaces:**
- Consumes: `renderCard?: (row: TData, index: number) => React.ReactNode` in `DataTableProps<TData>`
- Produces: Dual-view rendering (table for `sm:block` and card container for `sm:hidden`)

- [ ] **Step 1: Write test cases in `apps/web/src/test/data-table.test.tsx` for `renderCard`**

Add tests to `apps/web/src/test/data-table.test.tsx`:
```tsx
  it('renders card view container when renderCard is provided', () => {
    const data: DummyRow[] = [
      { id: 1, title: 'Laptop Rusak' },
      { id: 2, title: 'Mouse Macet' },
    ];
    render(
      <DataTable
        columns={dummyColumns}
        data={data}
        renderCard={(row) => (
          <div data-testid={`mobile-card-${row.id}`}>
            <h4>{row.title}</h4>
          </div>
        )}
      />
    );

    expect(screen.getByTestId('mobile-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-card-2')).toBeInTheDocument();
    expect(screen.getByText('Mouse Macet')).toBeInTheDocument();
  });

  it('renders skeleton cards in mobile container when isLoading is true and renderCard is provided', () => {
    render(
      <DataTable
        columns={dummyColumns}
        data={[]}
        isLoading={true}
        renderCard={(row) => <div>{row.title}</div>}
      />
    );

    const skeletons = screen.getAllByTestId('table-card-skeleton');
    expect(skeletons.length).toBe(3);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/test/data-table.test.tsx --prefix apps/web`
Expected: FAIL (`renderCard` prop not implemented and skeleton test-id missing)

- [ ] **Step 3: Update `apps/web/src/components/shared/data-table/data-table.tsx`**

Update `DataTableProps` and render logic:
```tsx
// add renderCard to DataTableProps
export interface DataTableProps<TData> {
  columns: ColumnDef<TData>[];
  data: TData[];
  meta?: PaginationMeta;
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onPageChange?: (page: number) => void;
  onPerPageChange?: (perPage: number) => void;
  renderCard?: (row: TData, index: number) => React.ReactNode; // added
}

// ... in DataTable body
export function DataTable<TData>({
  columns,
  data,
  meta,
  isLoading = false,
  emptyTitle,
  emptyDescription,
  onPageChange,
  onPerPageChange,
  renderCard,
}: DataTableProps<TData>) {
  return (
    <div className="space-y-3">
      {/* Desktop View Table */}
      <div
        className={cn(
          'rounded-xl border border-border bg-card overflow-hidden',
          renderCard && 'hidden sm:block'
        )}
      >
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-border hover:bg-transparent">
              {columns.map((col) => (
                <TableHead
                  key={col.id}
                  className={col.className ?? 'text-muted-foreground font-semibold text-xs py-3'}
                >
                  {typeof col.header === 'function'
                    ? col.header({ column: col })
                    : col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <TableRow key={`skeleton-row-${rIdx}`} className="border-border">
                  {columns.map((col, cIdx) => (
                    <TableCell key={`skeleton-cell-${cIdx}`} className="py-3">
                      <Skeleton className="h-5 w-full rounded-sm" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow className="border-0 hover:bg-transparent">
                <TableCell colSpan={columns.length} className="p-8 text-center">
                  <EmptyState title={emptyTitle} description={emptyDescription} />
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIdx) => (
                <TableRow
                  key={`data-row-${rowIdx}`}
                  className="border-border transition-colors hover:bg-muted/30"
                >
                  {columns.map((col) => {
                    const value = col.accessorKey ? row[col.accessorKey] : undefined;
                    return (
                      <TableCell key={col.id} className={col.className ?? 'py-3 text-sm'}>
                        {col.cell ? col.cell({ row, value }) : String(value ?? '-')}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile View Cards */}
      {renderCard && (
        <div className="block sm:hidden space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`card-skeleton-${idx}`}
                data-testid="table-card-skeleton"
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <Skeleton className="h-5 w-1/3 rounded-sm" />
                <Skeleton className="h-4 w-full rounded-sm" />
                <Skeleton className="h-4 w-2/3 rounded-sm" />
              </div>
            ))
          ) : data.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-8 text-center">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </div>
          ) : (
            data.map((row, idx) => (
              <React.Fragment key={`mobile-card-row-${idx}`}>
                {renderCard(row, idx)}
              </React.Fragment>
            ))
          )}
        </div>
      )}

      {meta && onPageChange && (
        <DataTablePagination
          meta={meta}
          onPageChange={onPageChange}
          onPerPageChange={onPerPageChange}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test src/test/data-table.test.tsx --prefix apps/web`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/shared/data-table/data-table.tsx apps/web/src/test/data-table.test.tsx
git commit -m "feat(web): add responsive mobile card adapter to DataTable"
```

---

### Task 4: `MobileFilterSheet` Component & `FilterBar` Integration

**Files:**
- Create: `apps/web/src/components/shared/mobile-filter-sheet.tsx`
- Modify: `apps/web/src/components/shared/filter-bar.tsx`
- Test: `apps/web/src/test/mobile-filter-sheet.test.tsx`
- Modify: `apps/web/src/test/filter-bar.test.tsx`

**Interfaces:**
- Consumes:
  ```ts
  interface MobileFilterSheetProps {
    filters: FilterField[];
    onFilterChange?: (filterId: string, value: string) => void;
    onResetFilters?: () => void;
    hasActiveFilters?: boolean;
  }
  ```
- Produces: Integrated responsive FilterBar with trigger button + bottom drawer in mobile view.

- [ ] **Step 1: Write test for `MobileFilterSheet`**

```tsx
// apps/web/src/test/mobile-filter-sheet.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MobileFilterSheet } from '@/components/shared/mobile-filter-sheet';
import type { FilterField } from '@/components/shared/filter-bar';

describe('MobileFilterSheet Component', () => {
  const mockFilters: FilterField[] = [
    {
      id: 'status',
      label: 'Status',
      value: 'OPEN',
      options: [
        { label: 'Open', value: 'OPEN' },
        { label: 'Closed', value: 'CLOSED' },
      ],
    },
    {
      id: 'priority',
      label: 'Prioritas',
      value: '',
      options: [{ label: 'Tinggi', value: 'HIGH' }],
    },
  ];

  it('renders trigger button with active count badge', () => {
    render(
      <MobileFilterSheet
        filters={mockFilters}
        hasActiveFilters={true}
      />
    );

    const trigger = screen.getByRole('button', { name: /filter/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument(); // 1 active filter
  });

  it('opens sheet and handles reset filters callback', async () => {
    const user = userEvent.setup();
    const handleReset = vi.fn();

    render(
      <MobileFilterSheet
        filters={mockFilters}
        hasActiveFilters={true}
        onResetFilters={handleReset}
      />
    );

    await user.click(screen.getByRole('button', { name: /filter/i }));
    expect(screen.getByText('Filter Data')).toBeInTheDocument();

    const resetBtn = screen.getByRole('button', { name: /reset/i });
    await user.click(resetBtn);
    expect(handleReset).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test src/test/mobile-filter-sheet.test.tsx --prefix apps/web`
Expected: FAIL (Cannot find module `@/components/shared/mobile-filter-sheet`)

- [ ] **Step 3: Implement `MobileFilterSheet`**

```tsx
// apps/web/src/components/shared/mobile-filter-sheet.tsx
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
```

- [ ] **Step 4: Integrate `MobileFilterSheet` into `FilterBar` (`apps/web/src/components/shared/filter-bar.tsx`)**

Update `FilterBar` to show horizontal selects on `sm:flex` and `MobileFilterSheet` on `sm:hidden`. Replace the whole component with:
```tsx
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
import { MobileFilterSheet } from '@/components/shared/mobile-filter-sheet';

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
      {/* Left Section: Search & Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {onSearchChange && (
          <div className="flex-1 min-w-[200px] sm:flex-initial">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder}
            />
          </div>
        )}

        {/* Desktop Filter Dropdowns */}
        {filters.length > 0 && (
          <div className="hidden sm:flex sm:flex-wrap items-center gap-2">
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
        )}

        {/* Mobile Bottom Sheet Filter */}
        {filters.length > 0 && (
          <div className="sm:hidden">
            <MobileFilterSheet
              filters={filters}
              onFilterChange={onFilterChange}
              onResetFilters={onResetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        )}
      </div>

      {/* Right Section: Children / Extra Actions */}
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 5: Add tests for `FilterBar` mobile rendering in `apps/web/src/test/filter-bar.test.tsx`**

```tsx
import { render, screen } from '@testing-library/react';
import { FilterBar } from '@/components/shared/filter-bar';

describe('FilterBar Component', () => {
  it('renders filter trigger button on mobile', () => {
    render(
      <FilterBar
        filters={[
          { id: 'status', label: 'Status', options: [{ label: 'Open', value: 'OPEN' }] },
        ]}
      />
    );
    expect(screen.getByRole('button', { name: /filter/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test src/test/mobile-filter-sheet.test.tsx src/test/filter-bar.test.tsx --prefix apps/web`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/shared/mobile-filter-sheet.tsx apps/web/src/components/shared/filter-bar.tsx apps/web/src/test/mobile-filter-sheet.test.tsx apps/web/src/test/filter-bar.test.tsx
git commit -m "feat(web): introduce MobileFilterSheet and integrate into FilterBar"
```
