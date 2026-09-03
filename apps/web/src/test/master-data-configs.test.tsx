import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import {
  departmentSchema,
  ticketCategorySchema,
  knowledgeCategorySchema,
  ticketPrioritySchema,
  buildCategoryTreeOptions,
  departmentConfigBase,
  ticketPriorityConfigBase,
} from '@/components/admin/master-data-configs';
import { MasterDataPage } from '@/components/shared/MasterDataPage';
import { apiFetch } from '@/lib/client/api';
import type { TicketCategory } from '@/types/tickets';

vi.mock('@/lib/client/api', () => ({
  apiFetch: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    constructor(
      public status: number,
      message: string,
      public errors?: Record<string, string[]>
    ) {
      super(message);
    }
  },
}));

describe('Master Data Schemas & Tree Helpers', () => {
  it('validates department schema', () => {
    const valid = departmentSchema.safeParse({
      name: 'Human Resources',
      description: 'Divisi HR',
    });
    expect(valid.success).toBe(true);

    const empty = departmentSchema.safeParse({ name: '' });
    expect(empty.success).toBe(false);
  });

  it('validates ticket category schema', () => {
    const valid = ticketCategorySchema.safeParse({
      name: 'Hardware',
      description: 'Masalah perangkat keras',
      parent_id: null,
    });
    expect(valid.success).toBe(true);
  });

  it('validates knowledge category schema', () => {
    const valid = knowledgeCategorySchema.safeParse({
      name: 'Panduan Email',
      description: 'Setup dan troubleshooting email',
    });
    expect(valid.success).toBe(true);

    const invalid = knowledgeCategorySchema.safeParse({ name: '' });
    expect(invalid.success).toBe(false);
  });

  it('validates ticket priority schema and requirements', () => {
    const valid = ticketPrioritySchema.safeParse({
      name: 'Kritis',
      level: 1,
      sla_minutes: 60,
      description: 'Sistem down total',
    });
    expect(valid.success).toBe(true);

    const zeroSla = ticketPrioritySchema.safeParse({
      name: 'Kritis',
      level: 1,
      sla_minutes: 0,
    });
    expect(zeroSla.success).toBe(false);
  });

  it('buildCategoryTreeOptions handles tree hierarchy and excludes self/descendants', () => {
    const categories: TicketCategory[] = [
      { id: 1, name: 'Hardware', description: null, parent_id: null },
      { id: 2, name: 'Laptop', description: null, parent_id: 1 },
      { id: 3, name: 'Keyboard', description: null, parent_id: 2 },
      { id: 4, name: 'Software', description: null, parent_id: null },
    ];

    // Case 1: create mode (editingId is null) -> all available with indent
    const createOptions = buildCategoryTreeOptions(categories, null);
    expect(createOptions[0]).toEqual({
      value: 'NONE',
      label: '— Tanpa Induk (Kategori Utama) —',
    });
    expect(createOptions.find((o) => o.value === '1')?.label).toBe('Hardware');
    expect(createOptions.find((o) => o.value === '2')?.label).toBe('—  Laptop');
    expect(createOptions.find((o) => o.value === '3')?.label).toBe('— —  Keyboard');

    // Case 2: edit mode on id 1 -> excludes 1, 2, and 3 (prevent cycles)
    const edit1Options = buildCategoryTreeOptions(categories, 1);
    expect(edit1Options.some((o) => o.value === '1')).toBe(false);
    expect(edit1Options.some((o) => o.value === '2')).toBe(false);
    expect(edit1Options.some((o) => o.value === '3')).toBe(false);
    expect(edit1Options.some((o) => o.value === '4')).toBe(true);
  });
});

describe('MasterDataPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders department master data page with title and data', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Departments retrieved.',
      data: [
        { id: 1, name: 'IT Infrastructure', description: 'Network & servers' },
      ],
    });

    renderWithProviders(
      <MasterDataPage
        {...departmentConfigBase}
        columns={[
          {
            id: 'name',
            header: 'Nama',
            cell: ({ row }) => <span>{row.name}</span>,
          },
        ]}
      />
    );

    expect(screen.getByText('Departemen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /tambah departemen/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('IT Infrastructure')).toBeInTheDocument();
    });
  });

  it('includes SLA hint in ticket priority config fields', () => {
    const fields = Array.isArray(ticketPriorityConfigBase.formFields)
      ? ticketPriorityConfigBase.formFields
      : ticketPriorityConfigBase.formFields([], null);
    const slaField = fields.find(
      (f: { name: string }) => f.name === 'sla_minutes'
    );
    expect(slaField).toBeDefined();
    expect(slaField?.hint).toContain('hanya berlaku untuk tiket baru');
  });
});
