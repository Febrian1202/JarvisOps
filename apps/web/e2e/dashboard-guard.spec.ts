import { test, expect } from '@playwright/test';

test.describe.serial('Cross-Role Dashboard Authorization Guard E2E', () => {
  test('Test 1: Employee opening /dashboard/manager gets redirected to /403', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/dashboard/manager');
    await page.waitForURL(/\/403/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '403 — Akses Ditolak' })).toBeVisible();
  });

  test('Test 2: Technician opening /dashboard/admin gets redirected to /403', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'technician@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/dashboard/admin');
    await page.waitForURL(/\/403/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '403 — Akses Ditolak' })).toBeVisible();
  });

  test('Test 3: Manager opening /dashboard/admin gets redirected to /403', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/dashboard/admin');
    await page.waitForURL(/\/403/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '403 — Akses Ditolak' })).toBeVisible();
  });

  test('Test 4: Admin opening /dashboard/employee can access successfully', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/dashboard/employee');
    await expect(page).toHaveURL(/\/dashboard\/employee$/);
    await expect(page.getByText('ticket yang sedang berjalan')).toBeVisible({ timeout: 10000 });
  });

  test('Test 5: Employee opening /dashboard/technician gets redirected to /403', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/dashboard/technician');
    await page.waitForURL(/\/403/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '403 — Akses Ditolak' })).toBeVisible();
  });
});
