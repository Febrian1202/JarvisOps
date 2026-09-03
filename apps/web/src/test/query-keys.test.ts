import { describe, it, expect } from 'vitest';
import { ticketKeys, assetKeys, authKeys, dashboardKeys } from '@/lib/query-keys';

describe('Query Key Factories', () => {
  it('generates structured ticket query key arrays', () => {
    expect(ticketKeys.all).toEqual(['tickets']);
    expect(ticketKeys.lists()).toEqual(['tickets', 'list']);
    expect(ticketKeys.list({ status: 'OPEN' })).toEqual(['tickets', 'list', { status: 'OPEN' }]);
    expect(ticketKeys.details()).toEqual(['tickets', 'detail']);
    expect(ticketKeys.detail(12)).toEqual(['tickets', 'detail', 12]);
  });

  it('generates structured asset query keys', () => {
    expect(assetKeys.all).toEqual(['assets']);
    expect(assetKeys.myAssets()).toEqual(['assets', 'my-assets']);
    expect(assetKeys.detail(5)).toEqual(['assets', 'detail', 5]);
  });

  it('generates auth & dashboard keys', () => {
    expect(authKeys.me()).toEqual(['auth', 'me']);
    expect(dashboardKeys.manager({ date_from: '2026-08-01' })).toEqual([
      'dashboard',
      'manager',
      { date_from: '2026-08-01' },
    ]);
  });
});
