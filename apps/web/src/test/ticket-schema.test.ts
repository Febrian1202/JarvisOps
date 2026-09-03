import { describe, it, expect } from 'vitest';
import { ticketSchema } from '@/schemas/ticket';

describe('ticketSchema', () => {
  it('validates a correct payload', () => {
    const validData = {
      category_id: 1,
      priority_id: 2,
      asset_id: null,
      title: 'Monitor tidak menyala',
      description: 'Monitor tiba-tiba mati saat bekerja.',
    };
    const result = ticketSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const invalidData = {
      title: '',
      description: '',
    };
    const result = ticketSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const errorMap = result.error.flatten().fieldErrors;
      expect(errorMap.category_id).toBeDefined();
      expect(errorMap.priority_id).toBeDefined();
      expect(errorMap.title).toBeDefined();
      expect(errorMap.description).toBeDefined();
    }
  });

  it('rejects title longer than 200 characters', () => {
    const data = {
      category_id: 1,
      priority_id: 1,
      title: 'a'.repeat(201),
      description: 'Deskripsi valid',
    };
    const result = ticketSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});
