import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';

describe('Baseline UI Components Suite', () => {
  it('renders Badge with custom status variants', () => {
    render(
      <div>
        <Badge variant="success">Selesai</Badge>
        <Badge variant="warning">Tertunda</Badge>
      </div>
    );
    expect(screen.getByText('Selesai')).toHaveClass('bg-[#7c8c6e]');
    expect(screen.getByText('Tertunda')).toHaveClass('bg-[#b28259]');
  });

  it('renders Card with header and content', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Ringkasan Tiket</CardTitle>
        </CardHeader>
        <CardContent>5 Tiket Terbuka</CardContent>
      </Card>
    );
    expect(screen.getByText('Ringkasan Tiket')).toBeInTheDocument();
    expect(screen.getByText('5 Tiket Terbuka')).toBeInTheDocument();
  });

  it('renders Input and Textarea', () => {
    render(
      <div>
        <Input placeholder="Cari tiket..." aria-label="Pencarian" />
        <Textarea placeholder="Keterangan..." aria-label="Keterangan" />
      </div>
    );
    expect(screen.getByPlaceholderText('Cari tiket...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Keterangan...')).toBeInTheDocument();
  });

  it('renders accessible Table elements', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nomor</TableHead>
            <TableHead>Judul</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>TCK-001</TableCell>
            <TableCell>Laptop Rusak</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    );
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByText('TCK-001')).toBeInTheDocument();
  });

  it('renders Separator', () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass('bg-border');
  });
});
