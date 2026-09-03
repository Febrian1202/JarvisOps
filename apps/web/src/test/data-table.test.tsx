import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DataTable } from '@/components/shared/data-table/data-table';
import type { ColumnDef } from '@/components/shared/data-table/data-table';

describe('DataTable Component', () => {
  interface DummyRow {
    id: number;
    title: string;
  }

  const dummyColumns: ColumnDef<DummyRow>[] = [
    { id: 'id', header: 'ID', accessorKey: 'id' },
    { id: 'title', header: 'Judul', accessorKey: 'title' },
  ];

  it('renders table headers and rows correctly', () => {
    const data: DummyRow[] = [{ id: 1, title: 'Laptop Rusak' }];
    render(<DataTable columns={dummyColumns} data={data} />);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Laptop Rusak')).toBeInTheDocument();
  });

  it('displays empty state when data is empty', () => {
    render(<DataTable columns={dummyColumns} data={[]} />);
    expect(screen.getByText(/tidak ada data/i)).toBeInTheDocument();
  });
});
