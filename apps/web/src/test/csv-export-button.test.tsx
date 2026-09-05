import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CsvExportButton } from '@/components/shared/CsvExportButton';

const mockCan = vi.fn();
const mockHasRole = vi.fn();

vi.mock('@/components/providers/auth-provider', () => ({
  useAuth: () => ({
    can: mockCan,
    hasRole: mockHasRole,
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('status_id=1&priority_id=2'),
}));

const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

describe('CsvExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when user does not have permission', () => {
    mockCan.mockReturnValue(false);
    mockHasRole.mockReturnValue(false);

    const { container } = render(<CsvExportButton entity="tickets" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for employee role on tickets export', () => {
    mockCan.mockReturnValue(true);
    mockHasRole.mockImplementation((role) => role === 'employee');

    const { container } = render(<CsvExportButton entity="tickets" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders button for technician or manager on tickets export', () => {
    mockCan.mockReturnValue(true);
    mockHasRole.mockImplementation((role) => role === 'technician');

    render(<CsvExportButton entity="tickets" />);
    expect(screen.getByRole('button', { name: /ekspor tickets/i })).toBeInTheDocument();
    expect(screen.getByText('Ekspor CSV')).toBeInTheDocument();
  });

  it('triggers download fetch with query params and creates download link', async () => {
    mockCan.mockReturnValue(true);
    mockHasRole.mockReturnValue(false);

    const createObjectURLMock = vi.fn(() => 'blob:mock-url');
    const revokeObjectURLMock = vi.fn();
    window.URL.createObjectURL = createObjectURLMock;
    window.URL.revokeObjectURL = revokeObjectURLMock;

    const mockBlob = new Blob(['test,data'], { type: 'text/csv' });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({
        'content-disposition': 'attachment; filename="tickets-2026.csv"',
      }),
      blob: async () => mockBlob,
    });
    global.fetch = mockFetch;

    render(<CsvExportButton entity="tickets" />);
    const button = screen.getByRole('button', { name: /ekspor tickets/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/proxy/export/tickets?status_id=1&priority_id=2',
        expect.objectContaining({
          method: 'GET',
          headers: { Accept: 'text/csv' },
        })
      );
      expect(mockToastSuccess).toHaveBeenCalledWith('File CSV berhasil diunduh.');
    });
  });

  it('handles error response and shows error toast', async () => {
    mockCan.mockReturnValue(true);
    mockHasRole.mockReturnValue(false);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: 'Terlalu banyak permintaan ekspor.' }),
    });
    global.fetch = mockFetch;

    render(<CsvExportButton entity="tickets" />);
    const button = screen.getByRole('button', { name: /ekspor tickets/i });

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Terlalu banyak permintaan ekspor.');
    });
  });
});
