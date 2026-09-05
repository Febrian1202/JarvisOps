import { test, expect } from '@playwright/test';

test.describe.serial('Role-based Dashboard Routing & Metric Consistency', () => {
  test('Test 1: Employee login redirects to employee dashboard', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard\/employee$/);
    await expect(page.locator('main').getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('ticket yang sedang berjalan')).toBeVisible();
  });

  test('Test 2: Technician login redirects to technician dashboard', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'technician@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard\/technician$/);
    await expect(page.getByRole('heading', { name: 'Dashboard Teknisi' })).toBeVisible();
    await expect(page.getByText('Ditugaskan ke Saya')).toBeVisible();
  });

  test('Test 3: Manager login redirects to manager dashboard', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard\/manager$/);
    await expect(
      page.getByText('Pantau metrik SLA operasional', { exact: false })
    ).toBeVisible();
  });

  test('Test 4: Admin login redirects to admin dashboard', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    await page.goto('/');
    await expect(page).toHaveURL(/\/dashboard\/admin$/);
    await expect(page.getByText('Total Pengguna', { exact: true })).toBeVisible();
    await expect(
      page.getByText('Ringkasan metrik sistem, status operasional', { exact: false })
    ).toBeVisible();
  });

  test('Test 5: Manager dashboard UI metrics match API response data', async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    const dashboardResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/proxy/dashboard/manager') && response.status() === 200,
      { timeout: 15000 }
    );

    await page.goto('/dashboard/manager');

    const response = await dashboardResponsePromise;
    const json = await response.json();
    const expectedTotal = json.data.total_tickets;

    const totalTicketCard = page.locator('div.rounded-card', { has: page.getByText('Total Ticket', { exact: true }) });
    await expect(totalTicketCard.locator('.text-2xl')).toHaveText(String(expectedTotal));
  });
});
