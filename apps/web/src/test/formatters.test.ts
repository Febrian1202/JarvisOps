import { describe, expect, it } from 'vitest';
import { formatDuration, formatSlaRemaining } from '@/lib/formatters';

describe('formatDuration', () => {
  it('formats minutes to Indonesian duration', () => {
    expect(formatDuration(null)).toBe('—');
    expect(formatDuration(0)).toBe('0m');
    expect(formatDuration(-10)).toBe('0m');
    expect(formatDuration(45)).toBe('45m');
    expect(formatDuration(180)).toBe('3j');
    expect(formatDuration(195)).toBe('3j 15m');
    expect(formatDuration(1440)).toBe('1h');
    expect(formatDuration(1500)).toBe('1h 1j');
    expect(formatDuration(1515)).toBe('1h 1j 15m');
    expect(formatDuration(2880)).toBe('2h');
  });
});

describe('formatSlaRemaining', () => {
  it('shows Selesai for finished tickets', () => {
    expect(formatSlaRemaining(-18, true)).toBe('Selesai');
    expect(formatSlaRemaining(120, true)).toBe('Selesai');
  });

  it('formats null values', () => {
    expect(formatSlaRemaining(null)).toBe('—');
    expect(formatSlaRemaining(null, false)).toBe('—');
  });

  it('formats remaining and overdue signed minutes', () => {
    expect(formatSlaRemaining(134, false)).toBe('2j 14m');
    expect(formatSlaRemaining(0, false)).toBe('0m');
    expect(formatSlaRemaining(-18, false)).toBe('Terlambat 18m');
    expect(formatSlaRemaining(-195, false)).toBe('Terlambat 3j 15m');
  });
});
