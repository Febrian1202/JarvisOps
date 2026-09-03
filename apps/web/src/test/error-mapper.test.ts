import { describe, it, expect } from 'vitest';
import { mapApiErrorMessages } from '@/lib/client/error-mapper';

describe('Error Mapper', () => {
  it('translates validation error messages into polite Indonesian', () => {
    const rawErrors = {
      title: ['validation.required'],
      per_page: ['validation.max.numeric'],
      email: ['validation.email'],
    };
    const mapped = mapApiErrorMessages(rawErrors);
    expect(mapped.title).toBe('Kolom ini wajib diisi.');
    expect(mapped.per_page).toBe('Nilai melebihi batas maksimal.');
    expect(mapped.email).toBe('Format email tidak valid.');
  });

  it('keeps custom Indonesian backend messages unchanged', () => {
    const rawErrors = {
      current_password: ['Password lama tidak cocok.'],
    };
    const mapped = mapApiErrorMessages(rawErrors);
    expect(mapped.current_password).toBe('Password lama tidak cocok.');
  });
});
