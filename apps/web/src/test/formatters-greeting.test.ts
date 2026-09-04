import { describe, it, expect } from 'vitest';
import { getGreeting } from '@/lib/formatters';

describe('getGreeting', () => {
  it('returns Selamat pagi for morning hours (00:00 - 10:59)', () => {
    expect(getGreeting(0)).toBe('Selamat pagi');
    expect(getGreeting(7)).toBe('Selamat pagi');
    expect(getGreeting(10)).toBe('Selamat pagi');
  });

  it('returns Selamat siang for midday hours (11:00 - 14:59)', () => {
    expect(getGreeting(11)).toBe('Selamat siang');
    expect(getGreeting(13)).toBe('Selamat siang');
    expect(getGreeting(14)).toBe('Selamat siang');
  });

  it('returns Selamat sore for afternoon hours (15:00 - 18:59)', () => {
    expect(getGreeting(15)).toBe('Selamat sore');
    expect(getGreeting(17)).toBe('Selamat sore');
    expect(getGreeting(18)).toBe('Selamat sore');
  });

  it('returns Selamat malam for night hours (19:00 - 23:59)', () => {
    expect(getGreeting(19)).toBe('Selamat malam');
    expect(getGreeting(21)).toBe('Selamat malam');
    expect(getGreeting(23)).toBe('Selamat malam');
  });

  it('calculates WIB hour correctly when given a UTC Date object', () => {
    const dateMorning = new Date('2026-09-04T03:00:00Z');
    expect(getGreeting(dateMorning)).toBe('Selamat pagi');

    const dateNoon = new Date('2026-09-04T05:00:00Z');
    expect(getGreeting(dateNoon)).toBe('Selamat siang');
  });
});
