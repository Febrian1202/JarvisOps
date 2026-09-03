import { describe, it, expect } from 'vitest';
import { articleSchema } from '@/schemas/article';

describe('articleSchema', () => {
  it('accepts valid payload', () => {
    const result = articleSchema.safeParse({
      title: 'Cara Reset Password',
      category_id: 1,
      content: 'Langkah-langkah…',
      status: 'published',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty title, category and content', () => {
    const result = articleSchema.safeParse({
      title: '',
      category_id: null,
      content: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'title')).toBe(true);
      expect(result.error.issues.some((i) => i.path[0] === 'category_id')).toBe(true);
      expect(result.error.issues.some((i) => i.path[0] === 'content')).toBe(true);
    }
  });
});