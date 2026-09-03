import { test, expect } from '@playwright/test';

test('employee can view login page and input credentials', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[name="email"]')).toBeVisible();
  await expect(page.locator('input[name="password"]')).toBeVisible();
  await page.fill('input[name="email"]', 'employee@jarvisops.test');
  await page.fill('input[name="password"]', 'Password123!');
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});
