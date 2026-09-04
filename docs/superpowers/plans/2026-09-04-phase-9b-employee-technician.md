# Sub-tahap 9b — Dashboard Employee & Technician Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/dashboard/employee` (dynamic WIB greeting, 4 metric cards, mini ticket table with SLA remaining, assigned assets, latest articles) and `/dashboard/technician` (6 metric cards with danger tone for breached tickets, recent activity panel linked to tickets via search-by-number) following the warm-neutral design system, per-card skeleton loaders, and verified through Vitest tests.

**Architecture:** Client Components leveraging TanStack Query hooks in `apps/web/src/hooks/use-dashboards.ts` with `select: (res) => res.data` envelope unwrapping, `staleTime: 60_000`, and `refetchIntervalInBackground: false`. Shared layout structures powered by `MetricCard` and `DashboardPanel`. Server components handle metadata and Suspense wrappers.

**Tech Stack:** Next.js 16.3 (App Router), React 19, Tailwind CSS v4 (`@theme`), Lucide React, date-fns (Asia/Jakarta timezone), Vitest, React Testing Library.

**Spec:** `docs/tasks/phase-9/9b-employee-technician.md`, `docs/tasks/phase-9/README.md`, `docs/design/wireframe.pen` (frames 02 & 03).

## Global Constraints

- **Single API envelope:** Frontend consumes `{ success, message, data, meta? }` through BFF; all hooks unwrap via `select: (res) => res.data`. Never display English `message` in UI (D-24).
- **Null handling:** `null` on metrics (such as `avg_resolution_minutes`, `sla_compliance_percentage`) must render as "—", never `0` or `0%` (D-03, K6).
- **Timezone & Greetings:** Format timestamps in Asia/Jakarta (WIB) (D-23). Calculate dynamic greeting based on WIB hour: Pagi (00:00–10:59), Siang (11:00–14:59), Sore (15:00–18:59), Malam (19:00–23:59).
- **SLA remaining:** Format signed minutes via `formatSlaRemaining` (positive: "2j 14m", negative: "Terlambat 18m", resolved/closed: "Selesai") (D-28, C16).
- **Technician Queue:** `open_tickets` is the global unassigned/open pool across all technicians; label the card "Antrean OPEN (Bisa Diambil)", not "Tiket Open Saya" (K9, C12).
- **Activity ticket navigation:** Recent activities link to `/tickets?search={ticket_number}` if ticket is present; plain text if ticket is absent (C7, 9b Jebakan).
- **Skeleton per card:** When loading, render skeleton loaders per card/panel, not a single full-page spinner (K3).
- **Zero code comments:** Do not add code comments unless explicitly requested.

---

### Task 1: Greeting Formatter & Dashboard Hooks

**Files:**
- Modify: `apps/web/src/lib/formatters.ts`
- Create: `apps/web/src/hooks/use-dashboards.ts`
- Create: `apps/web/src/test/formatters-greeting.test.ts`

**Interfaces:**
- Consumes: `apiFetch` from `@/lib/client/api`, `dashboardKeys` from `@/lib/query-keys`, types `EmployeeDashboardData`, `TechnicianDashboardData` from `@/types/dashboard`.
- Produces:
  - `getGreeting(dateOrHour?: Date | number): string`
  - `useEmployeeDashboard(): UseQueryResult<EmployeeDashboardData>`
  - `useTechnicianDashboard(): UseQueryResult<TechnicianDashboardData>`

- [ ] **Step 1: Write the failing tests for `getGreeting`**

```typescript
// apps/web/src/test/formatters-greeting.test.ts
import { describe, it, expect } from 'vitest';
import { getGreeting } from '@/lib/formatters';

describe('getGreeting', () => {
  it('returns Selamat pagi for morning hours (00:00 - 10:59)', () => {
    expect(getGreeting(0)).toBe('Selamat pagi');
    expect(getGreeting(7)).toBe('Selamat pagi');
    expect(getGreeting(10)).toBe('Selamat pagi');
  });

  it('returns Selamat siang for midday hours (11:00 - 14:59)', () => {
    expect(getGreeting(11)).toBe('Selamat siang');
    expect(getGreeting(13)).toBe('Selamat siang');
    expect(getGreeting(14)).toBe('Selamat siang');
  });

  it('returns Selamat sore for afternoon hours (15:00 - 18:59)', () => {
    expect(getGreeting(15)).toBe('Selamat sore');
    expect(getGreeting(17)).toBe('Selamat sore');
    expect(getGreeting(18)).toBe('Selamat sore');
  });

  it('returns Selamat malam for night hours (19:00 - 23:59)', () => {
    expect(getGreeting(19)).toBe('Selamat malam');
    expect(getGreeting(21)).toBe('Selamat malam');
    expect(getGreeting(23)).toBe('Selamat malam');
  });

  it('calculates WIB hour correctly when given a UTC Date object', () => {
    // 03:00 UTC is 10:00 WIB -> pagi
    const dateMorning = new Date('2026-09-04T03:00:00Z');
    expect(getGreeting(dateMorning)).toBe('Selamat pagi');

    // 05:00 UTC is 12:00 WIB -> siang
    const dateNoon = new Date('2026-09-04T05:00:00Z');
    expect(getGreeting(dateNoon)).toBe('Selamat siang');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test src/test/formatters-greeting.test.ts`
Expected: FAIL with `getGreeting is not exported from '@/lib/formatters'`

- [ ] **Step 3: Implement `getGreeting` in `formatters.ts` and build `use-dashboards.ts`**

Add to `apps/web/src/lib/formatters.ts`:
```typescript
export function getGreeting(dateOrHour?: Date | number): string {
  let hour: number;

  if (typeof dateOrHour === 'number') {
    hour = dateOrHour;
  } else {
    const targetDate = dateOrHour ?? new Date();
    // Calculate WIB (UTC+7)
    const utcHours = targetDate.getUTCHours();
    hour = (utcHours + 7) % 24;
  }

  if (hour < 11) {
    return 'Selamat pagi';
  }
  if (hour < 15) {
    return 'Selamat siang';
  }
  if (hour < 19) {
    return 'Selamat sore';
  }
  return 'Selamat malam';
}
```

Create `apps/web/src/hooks/use-dashboards.ts`:
```typescript
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/client/api';
import { dashboardKeys } from '@/lib/query-keys';
import type { EmployeeDashboardData, TechnicianDashboardData } from '@/types/dashboard';

export function useEmployeeDashboard() {
  return useQuery({
    queryKey: dashboardKeys.employee(),
    queryFn: () => apiFetch<EmployeeDashboardData>('/dashboard/employee'),
    select: (res) => res.data,
    staleTime: 60_000,
    refetchIntervalInBackground: false,
  });
}

export function useTechnicianDashboard() {
  return useQuery({
    queryKey: dashboardKeys.technician(),
    queryFn: () => apiFetch<TechnicianDashboardData>('/dashboard/technician'),
    select: (res) => res.data,
    staleTime: 60_000,
    refetchIntervalInBackground: false,
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test src/test/formatters-greeting.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/formatters.ts apps/web/src/hooks/use-dashboards.ts apps/web/src/test/formatters-greeting.test.ts
git commit -m "feat(web): add getGreeting helper and dashboard query hooks"
```

---

### Task 2: Dashboard Employee (`/dashboard/employee`)

**Files:**
- Create: `apps/web/src/components/dashboard/employee/ticket-mini-table.tsx`
- Create: `apps/web/src/components/dashboard/employee/asset-list.tsx`
- Create: `apps/web/src/components/dashboard/employee/article-list.tsx`
- Create: `apps/web/src/components/dashboard/employee/employee-dashboard.tsx`
- Create: `apps/web/src/app/(app)/dashboard/employee/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/employee/page-client.tsx`
- Create: `apps/web/src/test/employee-dashboard.test.tsx`

**Interfaces:**
- Consumes: `useEmployeeDashboard`, `useAuth`, `MetricCard`, `DashboardPanel`, `StatusBadge`, `PriorityBadge`, `RelativeTime`, `EmptyState`, `formatSlaRemaining`, `getGreeting`.
- Produces:
  - `<TicketMiniTable tickets={TicketListItem[]} isLoading?: boolean />`
  - `<EmployeeAssetList assets={AssignableAsset[]} isLoading?: boolean />`
  - `<EmployeeArticleList articles={KnowledgeArticleListItem[]} isLoading?: boolean />`
  - `<EmployeeDashboard />`
  - Route `/dashboard/employee`

- [ ] **Step 1: Write the failing tests for Employee Dashboard**

Create `apps/web/src/test/employee-dashboard.test.tsx` testing:
- Renders greeting with user name ("Selamat ..., Ahmad Karyawan").
- Renders 4 metric cards: Ticket Terbuka (3), Sedang Dikerjakan (1), Selesai (5), Aset Dipegang (2).
- Shows CTA "Buat Ticket" only when `can('ticket.create')` is true.
- Mini table renders recent tickets with status badge, priority badge, SLA deadline calculation, and relative time.
- Clicking ticket row triggers navigation to `/tickets/:id`.
- Asset list and article list render items with proper badges and links.
- Empty states displayed when arrays are empty.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test src/test/employee-dashboard.test.tsx`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement components, page, and page-client**

1. `ticket-mini-table.tsx`:
   - Table displaying columns: NOMOR, JUDUL, STATUS, PRIORITAS, SISA SLA, DIBUAT.
   - Sisa SLA uses `formatSlaRemaining(diffInMinutes, isFinished)`.
   - Safe access for `ticket.technician?.full_name ?? '—'`.
   - Accessible table with `<th scope="col">`.
   - Links to `/tickets/${ticket.id}`.
2. `asset-list.tsx`:
   - Lists up to 5 assigned assets with icon, `name`, `asset_tag`, and `StatusBadge`.
   - Links to `/assets/${asset.id}`.
3. `article-list.tsx`:
   - Lists up to 5 knowledge articles with title, category badge, and published date.
   - Links to `/knowledge/${article.slug}`.
4. `employee-dashboard.tsx`:
   - Integrates `useEmployeeDashboard()` and `useAuth()`.
   - Header with dynamic greeting and CTA button (guarded by `can('ticket.create')`).
   - 4 `MetricCard`s in a 4-column responsive grid.
   - 2/3 (ticket table) and 1/3 (assets + articles) layout.
5. `page-client.tsx` and `page.tsx`:
   - Server page with metadata "Dashboard Karyawan | JARVIS OPS" and Suspense wrapper.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test src/test/employee-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/employee/ \
        apps/web/src/components/dashboard/employee/ \
        apps/web/src/test/employee-dashboard.test.tsx
git commit -m "feat(web): build employee dashboard with greeting, metrics, recent tickets, assets, and articles"
```

---

### Task 3: Dashboard Technician (`/dashboard/technician`)

**Files:**
- Create: `apps/web/src/components/dashboard/technician/activity-list.tsx`
- Create: `apps/web/src/components/dashboard/technician/technician-dashboard.tsx`
- Create: `apps/web/src/app/(app)/dashboard/technician/page.tsx`
- Create: `apps/web/src/app/(app)/dashboard/technician/page-client.tsx`
- Create: `apps/web/src/test/technician-dashboard.test.tsx`

**Interfaces:**
- Consumes: `useTechnicianDashboard`, `MetricCard`, `DashboardPanel`, `RelativeTime`, `EmptyState`, `formatDuration`, `getActivityFieldLabel`.
- Produces:
  - `<TechnicianActivityList activities={TicketHistoryItem[]} isLoading?: boolean />`
  - `<TechnicianDashboard />`
  - Route `/dashboard/technician`

- [ ] **Step 1: Write the failing tests for Technician Dashboard**

Create `apps/web/src/test/technician-dashboard.test.tsx` testing:
- Renders 6 metric cards: "Ditugaskan ke Saya", "Sedang Dikerjakan", "Antrean OPEN (Bisa Diambil)", "SLA Breached", "Rata-rata Waktu Selesai", "SLA Compliance Saya".
- "SLA Breached" card applies `tone="danger"` when `sla_breached > 0`.
- Null values on `avg_resolution_minutes` and `sla_compliance_percentage` display "—" (not "0" or "0%").
- Recent activity item displays field action label and links to `/tickets?search={ticket_number}` when ticket is present.
- Activity item renders plain text without link when ticket data is absent.
- Empty state displayed when `recent_activity` is empty.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test src/test/technician-dashboard.test.tsx`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement components, page, and page-client**

1. `activity-list.tsx`:
   - Renders `recent_activity` items with action icon based on `field_changed`.
   - Displays Indonesian label via `getActivityFieldLabel(field_changed)`.
   - Links to `/tickets?search=${encodeURIComponent(item.ticket.ticket_number)}` when `item.ticket` exists.
   - Shows relative time via `<RelativeTime date={item.created_at} />`.
   - Renders `EmptyState` when empty.
2. `technician-dashboard.tsx`:
   - Integrates `useTechnicianDashboard()`.
   - Header with title "Dashboard Teknisi" and subtitle.
   - 6 `MetricCard`s in a responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4`).
   - "Antrean OPEN (Bisa Diambil)" clearly labeled as global open queue.
   - `DashboardPanel` wrapping `TechnicianActivityList`.
3. `page-client.tsx` and `page.tsx`:
   - Server page with metadata "Dashboard Teknisi | JARVIS OPS" and Suspense wrapper.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test src/test/technician-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/\(app\)/dashboard/technician/ \
        apps/web/src/components/dashboard/technician/ \
        apps/web/src/test/technician-dashboard.test.tsx
git commit -m "feat(web): build technician dashboard with metrics, SLA highlight, and recent activity"
```

---

### Task 4: Integration Verification & Full Suite Checks

**Files:**
- Verification only across all test suites, lint, typecheck, and build.

- [ ] **Step 1: Run complete web test suite**

Run: `npm --prefix apps/web run test`
Expected: All tests pass (including existing 149+ frontend tests and new dashboard tests).

- [ ] **Step 2: Run TypeScript typecheck**

Run: `npm --prefix apps/web run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Run ESLint**

Run: `npm --prefix apps/web run lint`
Expected: 0 errors/warnings.

- [ ] **Step 4: Run production Next.js build**

Run: `npm --prefix apps/web run build`
Expected: Successful build with static routes generated for `/dashboard/employee` and `/dashboard/technician`.
