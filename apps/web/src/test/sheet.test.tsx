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
