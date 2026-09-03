import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { apiFetch } from '@/lib/client/api';
import type { AuthUser } from '@/types/auth';

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

const mockUser: AuthUser = {
  id: 1,
  email: 'andi@jarvis.test',
  full_name: 'Andi Kusuma',
  status: 'active',
  role: { id: 4, name: 'employee' },
  department: { id: 1, name: 'Information Technology' },
  profile: {
    employee_code: 'EMP-001',
    phone: '081234567890',
    position: 'Staff IT Support',
  },
};

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders initial profile fields and disables email', () => {
    renderWithProviders(<ProfileForm user={mockUser} />);

    // Name & Phone values
    expect(screen.getByDisplayValue('Andi Kusuma')).toBeInTheDocument();
    expect(screen.getByDisplayValue('081234567890')).toBeInTheDocument();

    // Readonly fields
    const emailInput = screen.getByDisplayValue('andi@jarvis.test');
    expect(emailInput).toBeDisabled();

    expect(screen.getByText('Karyawan')).toBeInTheDocument();
    expect(screen.getByText('Information Technology')).toBeInTheDocument();
    expect(screen.getByText('EMP-001')).toBeInTheDocument();
    expect(screen.getByText('Staff IT Support')).toBeInTheDocument();
  });

  it('submits updated full_name and phone to PUT /me', async () => {
    (apiFetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      message: 'Profile updated successfully.',
      data: { ...mockUser, full_name: 'Andi Kusuma Wijaya', profile: { ...mockUser.profile, phone: '0899999999' } },
    });

    renderWithProviders(<ProfileForm user={mockUser} />);

    const nameInput = screen.getByLabelText(/nama lengkap/i);
    fireEvent.change(nameInput, { target: { value: 'Andi Kusuma Wijaya' } });

    const submitBtn = screen.getByRole('button', { name: /simpan profil/i });
    expect(submitBtn).toBeEnabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiFetch).toHaveBeenCalledWith(
        '/me',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            full_name: 'Andi Kusuma Wijaya',
            phone: '081234567890',
          }),
        })
      );
    });
  });
});
