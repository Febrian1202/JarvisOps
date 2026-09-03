import { describe, it, expect } from 'vitest';
import { filterNavItems } from '@/lib/navigation';

describe('Role-Based Navigation Filtering', () => {
  it('shows only employee allowed items for plain employee', () => {
    const employeePermissions = [
      'dashboard.employee',
      'ticket.viewAny',
      'asset.viewOwn',
      'article.viewAny',
    ];
    const items = filterNavItems(employeePermissions, 'employee');

    expect(items.some((i) => i.href === '/')).toBe(true);
    expect(items.some((i) => i.href === '/tickets')).toBe(true);
    expect(items.some((i) => i.href === '/my-assets')).toBe(true);
    expect(items.some((i) => i.href === '/knowledge')).toBe(true);
    expect(items.some((i) => i.href === '/admin/users')).toBe(false);
    expect(items.some((i) => i.href === '/assets')).toBe(false);
  });

  it('shows admin menu for administrator', () => {
    const adminPermissions = [
      'dashboard.admin',
      'user.viewAny',
      'audit-log.viewAny',
      'department.manage',
      'ticket-category.manage',
      'ticket-priority.manage',
      'knowledge-category.manage',
      'asset.viewAny',
    ];
    const items = filterNavItems(adminPermissions, 'administrator');

    expect(items.some((i) => i.href === '/admin/users')).toBe(true);
    expect(items.some((i) => i.href === '/admin/audit-logs')).toBe(true);
    expect(items.some((i) => i.href === '/assets')).toBe(true);
  });
});
