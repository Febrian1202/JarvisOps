import React from 'react';
import { render, screen, within } from '@testing-library/react';
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
    expect(within(screen.getByTestId('mobile-card-2')).getByText('Mouse Macet')).toBeInTheDocument();
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
});
