import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '@/components/ui/button';

describe('Button Component', () => {
  it('renders with children text', () => {
    render(<Button>Simpan</Button>);
    expect(screen.getByRole('button', { name: /simpan/i })).toBeInTheDocument();
  });

  it('applies variant classes correctly', () => {
    render(<Button variant="destructive">Hapus</Button>);
    const btn = screen.getByRole('button', { name: /hapus/i });
    expect(btn).toHaveClass('bg-destructive');
  });

  it('supports disabled state', () => {
    render(<Button disabled>Nonaktif</Button>);
    expect(screen.getByRole('button', { name: /nonaktif/i })).toBeDisabled();
  });
});
