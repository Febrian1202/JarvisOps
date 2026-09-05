'use client';

import * as React from 'react';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, RotateCcw } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

/**
 * Returns YYYY-MM-DD in Asia/Jakarta (WIB) timezone for a given Date or now.
 */
export function getTodayWibString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Shifts days on a YYYY-MM-DD string cleanly via UTC date calculation.
 */
export function shiftWibDays(ymdString: string, daysDelta: number): string {
  const [y, m, d] = ymdString.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + daysDelta));
  return date.toISOString().slice(0, 10);
}

export type DatePreset = '7d' | '30d' | '90d';

/**
 * Calculates preset range in YYYY-MM-DD (WIB).
 * 7d  = today - 6 days through today (inclusive 7 days)
 * 30d = today - 29 days through today (inclusive 30 days)
 * 90d = today - 89 days through today (inclusive 90 days)
 */
export function presetRangeWib(
  preset: DatePreset,
  referenceDate: Date = new Date()
): { from: string; to: string } {
  const to = getTodayWibString(referenceDate);
  let daysDelta = -29;
  if (preset === '7d') daysDelta = -6;
  if (preset === '90d') daysDelta = -89;

  const from = shiftWibDays(to, daysDelta);
  return { from, to };
}

export interface DateRangePickerProps {
  from?: string; // YYYY-MM-DD (WIB)
  to?: string; // YYYY-MM-DD (WIB)
  onChange: (range: { from: string; to: string } | null) => void;
  className?: string;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Derive active range directly from props and in-flight selection
  const [selectedStart, setSelectedStart] = React.useState<Date | undefined>(undefined);

  const selectedRange: DateRange | undefined = React.useMemo(() => {
    if (selectedStart) {
      return { from: selectedStart, to: undefined };
    }
    if (!from && !to) return undefined;
    return {
      from: from ? parseISO(from) : undefined,
      to: to ? parseISO(to) : undefined,
    };
  }, [selectedStart, from, to]);

  const handlePreset = (preset: DatePreset) => {
    setSelectedStart(undefined);
    const range = presetRangeWib(preset);
    onChange(range);
    setOpen(false);
  };

  const handleReset = () => {
    setSelectedStart(undefined);
    onChange(null);
    setOpen(false);
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    if (!range || (!range.from && !range.to)) {
      setSelectedStart(undefined);
      onChange(null);
      return;
    }

    if (!selectedStart) {
      // First click: start range selection
      setSelectedStart(range.from);
      return;
    }

    // Second click: selection is complete
    const finalFrom = range.from || selectedStart;
    const finalTo = range.to || selectedStart;

    setSelectedStart(undefined);
    const fromStr = format(finalFrom, 'yyyy-MM-dd');
    const toStr = format(finalTo, 'yyyy-MM-dd');
    onChange({ from: fromStr, to: toStr });
  };

  const labelText = React.useMemo(() => {
    if (from && to) {
      return `${format(parseISO(from), 'd MMM yyyy', { locale: id })} - ${format(
        parseISO(to),
        'd MMM yyyy',
        { locale: id }
      )}`;
    }
    if (from) {
      return format(parseISO(from), 'd MMM yyyy', { locale: id });
    }
    return 'Pilih rentang tanggal';
  }, [from, to]);

  return (
    <div className={cn('relative inline-block', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'h-9 justify-start text-left font-normal focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              !from && !to && 'text-muted-foreground'
            )}
            aria-label="Rentang Tanggal"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            <span>{labelText}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            {/* Quick Presets */}
            <div className="flex flex-col gap-1 border-b border-border p-3 sm:w-36 sm:border-b-0 sm:border-r">
              <span className="text-xs font-semibold text-muted-foreground px-2 py-1">
                Preset
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-normal focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                onClick={() => handlePreset('7d')}
              >
                7 hari
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-normal focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                onClick={() => handlePreset('30d')}
              >
                30 hari
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-xs font-normal focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                onClick={() => handlePreset('90d')}
              >
                90 hari
              </Button>
              {(from || to) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 justify-start text-xs font-normal text-destructive hover:text-destructive hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={handleReset}
                >
                  <RotateCcw className="mr-1.5 h-3 w-3" />
                  Reset
                </Button>
              )}
            </div>

            {/* Calendar View */}
            <div className="p-2">
              <Calendar
                mode="range"
                defaultMonth={selectedRange?.from}
                selected={selectedRange}
                onSelect={handleCalendarSelect}
                numberOfMonths={1}
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
