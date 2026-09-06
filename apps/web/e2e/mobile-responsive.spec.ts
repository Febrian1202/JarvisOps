import { test, expect, type Page } from '@playwright/test';

async function loginAs(page: Page, email: string) {
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
}

async function assertNoHorizontalOverflow(page: Page, routeName: string) {
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth;
    const bodyScrollWidth = document.body.scrollWidth;
    const htmlScrollWidth = document.documentElement.scrollWidth;
    return {
      hasOverflow: htmlScrollWidth > docWidth + 1 || bodyScrollWidth > docWidth + 1,
      docWidth,
      htmlScrollWidth,
      bodyScrollWidth,
    };
  });
  expect(
    overflow.hasOverflow,
    `Route ${routeName} has horizontal overflow: docWidth=${overflow.docWidth}, html=${overflow.htmlScrollWidth}, body=${overflow.bodyScrollWidth}`
  ).toBe(false);
}

test.describe.serial('Mobile Responsive & Touch Ergonomics (Phase 11)', () => {
  let createdTicketUrl = '';

  test('Test 1: Mobile layout & navigation (sidebar hidden, hamburger opens MobileNav)', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginAs(page, 'employee@jarvisops.test');

    // 1. Sidebar desktop harus tersembunyi pada viewport ponsel
    const desktopSidebar = page.locator('aside');
    await expect(desktopSidebar).toBeHidden();

    // 2. Tombol hamburger terlihat di topbar
    const hamburgerBtn = page.getByRole('button', { name: 'Buka menu navigasi' });
    await expect(hamburgerBtn).toBeVisible();

    // 3. Klik hamburger membuka MobileNav drawer
    await hamburgerBtn.click();
    const mobileNavDrawer = page.locator('[role="dialog"]');
    await expect(mobileNavDrawer).toBeVisible();
    await expect(mobileNavDrawer.getByText('JARVIS OPS', { exact: true })).toBeVisible();
    await expect(mobileNavDrawer.getByText('Menu Utama')).toBeVisible();

    // 4. Klik link Tiket Layanan menutup drawer dan bernavigasi
    const ticketLink = mobileNavDrawer.getByRole('link', { name: 'Tiket Layanan' });
    await expect(ticketLink).toBeVisible();
    await ticketLink.click();
    await page.waitForURL(/\/tickets$/, { timeout: 10000 });
  });

  test('Test 2: Mobile /tickets renders card view, filter bottom sheet updates URL', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginAs(page, 'employee@jarvisops.test');

    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    // 1. Tabel desktop tersembunyi di mobile
    const desktopTable = page.locator('table');
    await expect(desktopTable).toBeHidden();

    // 2. Ticket cards terlihat di viewport
    const ticketCard = page.locator('[aria-label^="Tiket "]').first();
    await expect(ticketCard).toBeVisible({ timeout: 10000 });

    // 3. Tombol Filter mobile terlihat
    const filterBtn = page.getByRole('button', { name: /filter/i }).first();
    await expect(filterBtn).toBeVisible();

    // 4. Buka MobileFilterSheet
    await filterBtn.click();
    await expect(page.getByRole('heading', { name: 'Filter Data' })).toBeVisible();

    // 5. Ubah salah satu filter di dalam sheet (Prioritas atau Kategori)
    const filterSheet = page.locator('[role="dialog"]');
    const selectTrigger = filterSheet.locator('button[role="combobox"]').first();
    await selectTrigger.click();
    await page.locator('[role="option"]').nth(1).click();

    // 6. Klik tombol Tutup di footer sheet
    const closeBtn = filterSheet.getByRole('button', { name: 'Tutup', exact: true }).first();
    await closeBtn.click();

    // 7. Verifikasi sheet tertutup dan URL terupdate dengan query parameter
    await expect(filterSheet).toBeHidden();
    await page.waitForURL(/[?&](priority_id|category_id|status_id|sla_status)=/, { timeout: 10000 });
    expect(page.url()).toMatch(/[?&](priority_id|category_id|status_id|sla_status)=/);
  });

  test('Test 3: Mobile /tickets/[id] renders sticky action bar and triggers actions', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    // Login sebagai Teknisi untuk menguji action bar
    await loginAs(page, 'technician@jarvisops.test');

    // Buka tiket pertama dari daftar
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');
    const firstTicketCard = page.locator('[aria-label^="Tiket "]').first();
    await firstTicketCard.click();
    await page.waitForURL(/\/tickets\/\d+/, { timeout: 15000 });

    // Verifikasi sticky mobile action bar di bagian bawah
    const stickyBar = page.locator('.fixed.bottom-0.left-0.right-0.sm\\:hidden');
    await expect(stickyBar).toBeVisible();

    // Verifikasi tombol Komentar atau aksi teknisi memiliki touch target minimum 44px
    const commentBtn = stickyBar.getByRole('button', { name: /komentar/i });
    if (await commentBtn.isVisible()) {
      const box = await commentBtn.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(44);
      await commentBtn.click();
    }
  });

  test('Test 4: Mobile /tickets/new smoke test (fill and submit ticket without overflow)', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginAs(page, 'employee@jarvisops.test');

    await page.goto('/tickets/new');
    await expect(page.getByRole('heading', { name: 'Buat Tiket Permohonan Baru' })).toBeVisible();

    // Verifikasi tidak ada horizontal overflow saat membuka form
    await assertNoHorizontalOverflow(page, '/tickets/new');

    // Isi formulir tiket
    const categoryTrigger = page.getByRole('combobox', { name: 'Kategori *' });
    await categoryTrigger.click();
    await page.locator('[role="option"]').filter({ hasText: /hardware|software|network|account/i }).first().click();

    const priorityTrigger = page.getByRole('combobox', { name: 'Prioritas *' });
    await priorityTrigger.click();
    await page.locator('[role="option"]').filter({ hasText: /rendah|sedang|tinggi|kritis|low|medium|high|critical/i }).first().click();

    const uniqueTitle = `Kendala Layar Ponsel — ${Date.now()}`;
    await page.fill('input[name="title"]', uniqueTitle);
    await page.fill(
      'textarea[name="description"]',
      'Pengujian pembuatan tiket langsung dari antarmuka mobile responsif.'
    );

    // Submit form
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/tickets\/\d+/, { timeout: 15000 });
    createdTicketUrl = page.url();

    // Verifikasi judul tiket terlihat di detail page
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();
  });

  test('Test 5: Zero horizontal overflow on mobile viewport across main routes', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    // Login sebagai Admin agar dapat membuka seluruh halaman termasuk /admin/users
    await loginAs(page, 'admin@jarvisops.test');

    const routesToTest = [
      '/',
      '/tickets',
      createdTicketUrl || '/tickets/1',
      '/assets',
      '/knowledge',
      '/profile',
      '/admin/users',
      '/admin/audit-logs',
    ];

    for (const route of routesToTest) {
      await page.goto(route);
      await page.waitForLoadState('domcontentloaded');
      await assertNoHorizontalOverflow(page, route);
    }
  });

  test('Test 6: Mobile /admin/users renders card view and filter bottom sheet updates URL', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginAs(page, 'admin@jarvisops.test');

    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // 1. Tabel desktop harus tersembunyi di mobile
    await expect(page.locator('table')).toBeHidden();

    // 2. User card harus terlihat di mobile
    const userCards = page.locator('[data-testid="user-card-item"]');
    await expect(userCards.first()).toBeVisible({ timeout: 10000 });

    // 3. Tombol filter mobile membuka sheet dan memperbarui URL
    const filterBtn = page.getByRole('button', { name: /filter/i }).first();
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();
    const filterSheet = page.locator('[role="dialog"]');
    await expect(filterSheet).toBeVisible();

    const roleSelect = filterSheet.locator('button[role="combobox"]').first();
    await roleSelect.click();
    await page.locator('[role="option"]').nth(1).click();

    const closeBtn = filterSheet.getByRole('button', { name: 'Tutup', exact: true }).first();
    await closeBtn.click();
    await expect(filterSheet).toBeHidden();
    await page.waitForURL(/[?&]role_id=/, { timeout: 10000 });
    expect(page.url()).toMatch(/[?&]role_id=/);
  });

  test('Test 7: Mobile /admin/audit-logs renders card view and filter bottom sheet updates URL', async ({
    page,
    context,
  }) => {
    await context.clearCookies();
    await loginAs(page, 'admin@jarvisops.test');

    await page.goto('/admin/audit-logs');
    await page.waitForLoadState('networkidle');

    // 1. Tabel desktop harus tersembunyi di mobile
    await expect(page.locator('table')).toBeHidden();

    // 2. Audit log card harus terlihat di mobile
    const auditCards = page.locator('[data-testid="audit-log-card-item"]');
    await expect(auditCards.first()).toBeVisible({ timeout: 10000 });

    // 3. Tombol filter mobile membuka sheet dan memperbarui URL
    const mobileFilterContainer = page.locator('[data-testid="audit-log-filters-mobile"]');
    await expect(mobileFilterContainer).toBeVisible();
    const filterBtn = mobileFilterContainer.getByRole('button', { name: /filter/i });
    await expect(filterBtn).toBeVisible();
    await filterBtn.click();

    const filterSheet = page.locator('[role="dialog"]');
    await expect(filterSheet).toBeVisible();

    const moduleSelect = filterSheet.locator('button[role="combobox"]').first();
    await moduleSelect.click();
    await page.locator('[role="option"]').nth(1).click();

    const closeBtn = filterSheet.getByRole('button', { name: 'Tutup', exact: true }).first();
    await closeBtn.click();
    await expect(filterSheet).toBeHidden();
    await page.waitForURL(/[?&]module=/, { timeout: 10000 });
    expect(page.url()).toMatch(/[?&]module=/);
  });
});
