import { describe, it, expect } from 'vitest';
import { profileSchema, changePasswordSchema } from '@/schemas/profile';

describe('profileSchema', () => {
  it('validates a correct payload', () => {
    expect(
      profileSchema.safeParse({ full_name: 'Budi Santoso', phone: '08123456789' }).success
    ).toBe(true);
  });

  it('accepts an empty phone because it is optional', () => {
    expect(profileSchema.safeParse({ full_name: 'Budi Santoso', phone: '' }).success).toBe(true);
  });

  it('fails when full_name is empty', () => {
    const result = profileSchema.safeParse({ full_name: '', phone: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.full_name).toContain(
        'Nama lengkap wajib diisi.'
      );
    }
  });

  it('rejects full_name longer than 150 characters', () => {
    const result = profileSchema.safeParse({ full_name: 'a'.repeat(151) });
    expect(result.success).toBe(false);
  });

  it('rejects phone longer than 20 characters', () => {
    const result = profileSchema.safeParse({
      full_name: 'Budi Santoso',
      phone: '0'.repeat(21),
    });
    expect(result.success).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const validPayload = {
    current_password: 'OldSecret123',
    password: 'NewSecret123',
    password_confirmation: 'NewSecret123',
  };

  it('validates a correct payload', () => {
    expect(changePasswordSchema.safeParse(validPayload).success).toBe(true);
  });

  it('fails when current_password is empty', () => {
    const result = changePasswordSchema.safeParse({ ...validPayload, current_password: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.current_password).toContain(
        'Password saat ini wajib diisi.'
      );
    }
  });

  it('rejects a new password shorter than 8 characters', () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      password: 'Short1',
      password_confirmation: 'Short1',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password baru minimal 8 karakter.'
      );
    }
  });

  // Mirrors Password::min(8)->letters()->numbers() in ChangePasswordRequest.
  it('rejects a digits-only new password', () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      password: '12345678',
      password_confirmation: '12345678',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password baru harus mengandung huruf.'
      );
    }
  });

  it('rejects a letters-only new password', () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      password: 'abcdefgh',
      password_confirmation: 'abcdefgh',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        'Password baru harus mengandung angka.'
      );
    }
  });

  it('reports a mismatched confirmation on the password_confirmation field', () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      password_confirmation: 'OtherSecret123',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password_confirmation).toContain(
        'Konfirmasi password baru tidak cocok.'
      );
    }
  });

  it('fails when the confirmation is empty', () => {
    const result = changePasswordSchema.safeParse({
      ...validPayload,
      password_confirmation: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password_confirmation).toContain(
        'Konfirmasi password baru wajib diisi.'
      );
    }
  });
});
