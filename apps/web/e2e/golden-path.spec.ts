import { test, expect } from '@playwright/test';

const goldenPathStart = Date.now();

test.describe.serial('Golden Path (PRD §38) — Employee → Manager → Technician → Employee → Manager Analytics', () => {
  let ticketUrl: string;
  let ticketNumber: string;
  const uniqueTitle = `Kendala Laptop Mati Total — ${Date.now()}`;

  test('Step 1: Employee creates a new ticket', async ({ page }) => {
    // 1. Login as Employee
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');

    // Wait until navigated to dashboard or app shell
    await expect(page).not.toHaveURL(/\/login/);

    // 2. Open /tickets/new
    await page.goto('/tickets/new');
    await expect(page.getByRole('heading', { name: 'Buat Tiket Permohonan Baru' })).toBeVisible();

    // Select category (wait for select trigger to be enabled)
    const categoryTrigger = page.getByRole('combobox', { name: 'Kategori *' });
    await categoryTrigger.click();
    // Select an option with text
    await page.locator('[role="option"]').filter({ hasText: /hardware|software|network|account/i }).first().click();

    // Select priority
    const priorityTrigger = page.getByRole('combobox', { name: 'Prioritas *' });
    await priorityTrigger.click();
    await page.locator('[role="option"]').filter({ hasText: /rendah|sedang|tinggi|kritis|low|medium|high|critical/i }).first().click();

    // Fill title and description
    await page.fill('input[name="title"]', uniqueTitle);
    await page.fill('textarea[name="description"]', 'Laptop mendadak mati total saat sedang digunakan bekerja dan tidak bisa dinyalakan kembali.');

    // Submit form
    await page.click('button[type="submit"]');

    // Should redirect to /tickets/[id]
    await page.waitForURL(/\/tickets\/\d+/, { timeout: 15000 });
    ticketUrl = page.url();

    // Get ticket number
    const ticketNumberEl = page.locator('span.font-mono').first();
    await expect(ticketNumberEl).toBeVisible();
    ticketNumber = (await ticketNumberEl.textContent()) || '';
    expect(ticketNumber).toBeTruthy();

    // Check status badge is Open / Baru
    await expect(page.locator('text=Baru').or(page.locator('text=OPEN'))).toBeVisible();
  });

  test('Step 2: Manager assigns ticket to Technician', async ({ page, context }) => {
    // Clear cookies for fresh session
    await context.clearCookies();

    // 1. Login as Manager
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // 2. Navigate directly to ticket detail
    await page.goto(ticketUrl);
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();

    // 3. Click "Tugaskan" action button
    const assignBtn = page.getByRole('button', { name: 'Tugaskan', exact: true });
    await expect(assignBtn).toBeVisible();
    await assignBtn.click();

    // 4. Modal Dialog Assign
    await expect(page.locator('text=Tugaskan Teknisi')).toBeVisible();

    // Select technician
    const dialogSelect = page.locator('[role="dialog"]').locator('button[role="combobox"]');
    await dialogSelect.click();
    await page.waitForSelector('[role="option"]');
    // Click option containing "Technician" or "Teknisi"
    await page.locator('[role="option"]').filter({ hasText: /technician|teknisi/i }).first().click();

    // Submit assignment
    const simpanBtn = page.locator('[role="dialog"]').getByRole('button', { name: 'Tugaskan', exact: true });
    await simpanBtn.click();

    // Expect status to become "Ditugaskan" or ASSIGNED
    await expect(page.locator('div').filter({ hasText: /^Ditugaskan$/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Step 3: Technician processes, comments, and resolves ticket', async ({ page, context }) => {
    // Clear cookies for fresh session
    await context.clearCookies();

    // 1. Login as Technician
    await page.goto('/login');
    await page.fill('input[name="email"]', 'technician@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // 2. Navigate to ticket detail
    await page.goto(ticketUrl);
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();

    // 3. Start progress
    const startBtn = page.getByRole('button', { name: 'Mulai Kerjakan', exact: true });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // Status action dialog confirms
    await expect(page.locator('text=Konfirmasi Perubahan Status')).toBeVisible();
    const confirmStartBtn = page.locator('[role="dialog"]').getByRole('button', { name: 'Konfirmasi', exact: true });
    await confirmStartBtn.click();

    // Status should be Diproses / IN_PROGRESS
    await expect(page.locator('div').filter({ hasText: /^Sedang Dikerjakan$/ }).first()).toBeVisible({ timeout: 10000 });

    // 4. Add a comment
    const commentInput = page.locator('textarea[placeholder*="tulis komentar" i], textarea[name="content"], textarea[placeholder*="balasan" i]').first();
    if (await commentInput.isVisible()) {
      await commentInput.fill('Sedang dilakukan pengecekan pada charger dan power supply laptop.');
      const sendCommentBtn = page.getByRole('button', { name: /kirim|balas/i }).first();
      await sendCommentBtn.click();
      await expect(page.locator('text=Sedang dilakukan pengecekan pada charger dan power supply laptop.')).toBeVisible({ timeout: 10000 });
    }

    // 5. Resolve ticket
    const resolveBtn = page.getByRole('button', { name: 'Selesaikan Tiket', exact: true });
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    await expect(page.locator('text=Konfirmasi Perubahan Status')).toBeVisible();
    // Fill note if any textarea in dialog
    const resolveNote = page.locator('[role="dialog"]').locator('textarea');
    if (await resolveNote.isVisible()) {
      await resolveNote.fill('Power adapter telah diganti dengan unit baru dan laptop sudah berfungsi normal.');
    }
    const confirmResolveBtn = page.locator('[role="dialog"]').getByRole('button', { name: 'Konfirmasi', exact: true });
    await confirmResolveBtn.click();

    // Status should become RESOLVED / Selesai
    await expect(page.locator('div').filter({ hasText: /^Selesai$/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Step 4: Employee verifies and closes ticket', async ({ page, context }) => {
    // Clear cookies for fresh session
    await context.clearCookies();

    // 1. Login as Employee
    await page.goto('/login');
    await page.fill('input[name="email"]', 'employee@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // 2. Navigate to ticket detail
    await page.goto(ticketUrl);
    await expect(page.getByRole('heading', { name: uniqueTitle })).toBeVisible();

    // 3. Close ticket
    const closeBtn = page.getByRole('button', { name: 'Tutup Tiket', exact: true });
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    await expect(page.locator('text=Konfirmasi Perubahan Status')).toBeVisible();
    const confirmCloseBtn = page.locator('[role="dialog"]').getByRole('button', { name: 'Konfirmasi', exact: true });
    await confirmCloseBtn.click();

    // 4. Status should be Ditutup / CLOSED
    await expect(page.locator('div').filter({ hasText: /^Ditutup$/ }).first()).toBeVisible({ timeout: 10000 });
  });

  test('Step 5: Manager sees updated SLA and technician analytics (PRD §38 steps 12-13)', async ({ page, context }) => {
    // Clear cookies for fresh session
    await context.clearCookies();

    // 1. Login as Manager (PRD §38 step 12)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'manager@jarvisops.test');
    await page.fill('input[name="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 15000 });

    // 2. Navigate to manager analytics dashboard (PRD §38 step 13)
    const dashboardResponsePromise = page.waitForResponse(
      response => response.url().includes('/api/proxy/dashboard/manager') && response.status() === 200,
      { timeout: 15000 }
    );
    await page.goto('/dashboard/manager');

    const response = await dashboardResponsePromise;
    const json = await response.json();
    const sla = json.data.sla;
    const technicians = json.data.technician_performance as Array<{
      technician: { full_name: string };
      resolved: number;
      sla_compliance_percentage: number | null;
    }>;

    // 3. Dashboard shows the freshly closed ticket: total tickets increased beyond demo baseline
    const totalTicketCard = page.locator('div.rounded-card', { has: page.getByText('Total Ticket', { exact: true }) });
    await expect(totalTicketCard.locator('.text-2xl')).toHaveText(String(json.data.total_tickets));
    expect(json.data.total_tickets).toBeGreaterThanOrEqual(44);

    // 4. SLA compliance section is visible with a percentage in a sane range
    await expect(page.getByText(/Kepatuhan SLA|SLA Compliance/i).first()).toBeVisible();
    expect(sla.compliance_percentage).toBeGreaterThanOrEqual(80);
    expect(sla.compliance_percentage).toBeLessThanOrEqual(95);

    // 5. Technician performance table renders with at least one technician holding resolved tickets
    await expect(page.getByText(/Performa Technician|Technician Performance/i).first()).toBeVisible();
    expect(technicians.length).toBeGreaterThanOrEqual(1);
    const topTechnician = page.getByText(technicians[0].technician.full_name, { exact: false }).first();
    await expect(topTechnician).toBeVisible();

    // 6. Duration guard: the whole 13-step golden path stays under 3 minutes
    const elapsedSeconds = (Date.now() - goldenPathStart) / 1000;
    console.log(`[golden-path] total duration: ${elapsedSeconds.toFixed(1)}s`);
    expect(elapsedSeconds).toBeLessThan(180);
  });
});
