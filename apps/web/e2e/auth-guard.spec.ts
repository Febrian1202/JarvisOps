import { test, expect } from '@playwright/test';

test.describe.serial('Auth Guard E2E — Role-Based Access Control', () => {
  test('1. Employee opening /admin/users gets redirected to /403', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/admin/users');
    await page.waitForURL(/\/403/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '403 — Akses Ditolak' })).toBeVisible();
  });

  test('2. Employee opening /assets gets redirected to /403', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/assets');
    await page.waitForURL(/\/403/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '403 — Akses Ditolak' })).toBeVisible();
  });

  test('3. Employee sidebar does not render "Administrasi" section or admin links', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // Sidebar should not contain Administrasi heading or links to /admin/*
    await expect(page.locator('aside').getByText('Administrasi')).toHaveCount(0);
    await expect(page.locator('aside a[href^="/admin"]')).toHaveCount(0);
  });

  test('4. Manager opening /admin/audit-logs can view audit logs table', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/admin/audit-logs');
    await expect(page).toHaveURL(/\/admin\/audit-logs/);
    await expect(page.getByRole('heading', { name: 'Log Audit' })).toBeVisible({ timeout: 10000 });
    // Table or empty state is rendered
    await expect(page.locator('table').or(page.getByText('Belum ada log audit'))).toBeVisible({ timeout: 10000 });
  });

  test('5. Manager opening /admin/users gets redirected to /403', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/admin/users');
    await page.waitForURL(/\/403/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: '403 — Akses Ditolak' })).toBeVisible();
  });
});
