import { describe, it, expect } from 'vitest';

describe('Proxy Query String & Endpoint Builder', () => {
  it('constructs backend path with query strings preserved', () => {
    const pathArray = ['tickets'];
    const search = '?status=OPEN&page=2';
    const backendUrl = `/api/${pathArray.join('/')}${search}`;
    expect(backendUrl).toBe('/api/tickets?status=OPEN&page=2');
  });
});
