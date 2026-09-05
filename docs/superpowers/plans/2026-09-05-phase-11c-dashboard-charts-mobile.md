# Sub-tahap 11c — Dashboard & Charts Mobile Ergonomics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menjadikan dashboard 4 role (Employee, Technician, Manager, Admin) dan visualisasi grafik Recharts tetap terbaca dan nyaman dioperasikan pada layar ponsel 360px–430px: metrik kartu 2 kolom kompak, grafik tidak overflow/clipping, tabel menyembunyikan kolom sekunder di mobile, dan DateRangePicker menggunakan modal Dialog dengan touch target 44px.

**Architecture:** 
- Menggunakan CSS grid adaptif (`grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` dan `grid-cols-2 lg:grid-cols-4`) dengan tipografi kompak (`text-lg sm:text-2xl`) pada `MetricCard` dan `SlaComplianceCard`.
- Mengoptimalkan Recharts `ResponsiveContainer` (`h-56 sm:h-72`), margin horizontal minimal, dan ukuran tick 11px dengan gap padat agar tidak terpotong di mobile.
- Menerapkan responsive table column hiding (`hidden sm:table-cell` dan `hidden md:table-cell`) pada `TechnicianPerformanceTable` dan `TicketMiniTable`.
- Memanfaatkan hook `useIsMobile` dari 11a untuk percabangan `DateRangePicker`: Dialog modal fullscreen-ish di mobile dengan touch target minimal 44px (`h-11`), dan Popover di desktop.

**Tech Stack:** Next.js 16.3 App Router, React 19, Tailwind CSS v4, Radix UI Dialog & Popover, Recharts, `date-fns`, Vitest 4, `@testing-library/react`.

**Spec:** `docs/tasks/phase-11/11c-dashboard-charts-mobile.md`

## Global Constraints
- Branch: `feat/phase-11c-dashboard-mobile`
- Zero horizontal overflow: pada viewport 360px–430px tidak boleh ada horizontal scrollbar pada body/halaman dashboard.
- Touch target: semua elemen interaktif mobile (termasuk tombol trigger DateRangePicker) memenuhi batas minimal WCAG 2.2 AA (44×44px hit-box).
- Conventional commits: `feat(web): ...` / `test(web): ...`.
- Semua unit test Vitest di `apps/web/src/test/` dan typecheck wajib lulus 100%.

---

### Task 1: Compact Metric Cards & Responsive 2-Column Grid Across Dashboards

**Files:**
- Modify: `apps/web/src/components/dashboard/metric-card.tsx`
- Modify: `apps/web/src/components/dashboard/manager/sla-compliance-card.tsx`
- Modify: `apps/web/src/components/dashboard/manager/manager-metrics.tsx`
- Modify: `apps/web/src/components/dashboard/admin/admin-metrics.tsx`
- Modify: `apps/web/src/components/dashboard/employee/employee-dashboard.tsx`
- Modify: `apps/web/src/components/dashboard/technician/technician-dashboard.tsx`
- Test: `apps/web/src/test/dashboard-components.test.tsx`

**Interfaces:**
- Consumes: `MetricCardProps`, `SlaComplianceCardProps`
- Produces: Kompak 2-kolom mobile metric layout (`grid-cols-2`), ukuran angka `text-lg sm:text-2xl`, dan padding `p-3 sm:p-4`.

- [x] **Step 1: Write test asserting compact metric card styles and responsive classes**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Update `MetricCard` & `SlaComplianceCard` implementations**
- [x] **Step 4: Update metric grid containers across dashboards (Manager, Admin, Employee, Technician)**
- [x] **Step 5: Run tests to verify they pass**
- [x] **Step 6: Commit**

---

### Task 2: Responsive Recharts & Mobile Table Column Hiding

**Files:**
- Modify: `apps/web/src/components/dashboard/manager/ticket-trend-chart.tsx`
- Modify: `apps/web/src/components/dashboard/manager/technician-performance-table.tsx`
- Modify: `apps/web/src/components/dashboard/manager/category-distribution.tsx`
- Modify: `apps/web/src/components/dashboard/manager/priority-distribution.tsx`
- Modify: `apps/web/src/components/dashboard/employee/ticket-mini-table.tsx`
- Test: `apps/web/src/test/dashboard-components.test.tsx`

**Interfaces:**
- Consumes: Recharts components, `TechnicianPerformanceItem[]`, `TicketListItem[]`
- Produces: Responsif chart container (`h-56 sm:h-72`), XAxis `minTickGap={16}`, fontSize 11px, dan kolom sekunder tabel disembunyikan di mobile dengan `hidden sm:table-cell` / `hidden md:table-cell`.

- [x] **Step 1: Write test asserting mobile responsive column classes in `TechnicianPerformanceTable`**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Update `TicketTrendChartPanel` responsiveness**
- [x] **Step 4: Update `TechnicianPerformanceTable` secondary column hiding**
- [x] **Step 5: Update `TicketMiniTable`, `CategoryDistribution`, and `PriorityDistribution`**
- [x] **Step 6: Run tests to verify they pass**
- [x] **Step 7: Commit**

---

### Task 3: Mobile-Safe `DateRangePicker` with Dialog & 44px Touch Target

**Files:**
- Modify: `apps/web/src/components/dashboard/date-range-picker.tsx`
- Test: `apps/web/src/test/date-range-picker.test.tsx`

**Interfaces:**
- Consumes: `useIsMobile()` from `@/hooks/use-media-query`, Radix `Dialog` & `Popover` primitives
- Produces: Dual-mode picker (`Dialog` pada mobile, `Popover` pada desktop), touch target `min-h-[44px] h-11 sm:h-9`, dan label tanggal ringkas.

- [x] **Step 1: Write failing test for mobile Dialog behavior in DateRangePicker**
- [x] **Step 2: Run test to verify it fails**
- [x] **Step 3: Implement Mobile-Safe `DateRangePicker`**
- [x] **Step 4: Run all DateRangePicker tests**
- [x] **Step 5: Commit**

---

### Task 4: Sub-tahap 11c Verification & Phase Checklist Sync

**Files:**
- Modify: `docs/tasks/phase-11/11c-dashboard-charts-mobile.md`

- [x] **Step 1: Run comprehensive tests and linting**
- [x] **Step 2: Update checklist in `docs/tasks/phase-11/11c-dashboard-charts-mobile.md`**
- [x] **Step 3: Commit**
