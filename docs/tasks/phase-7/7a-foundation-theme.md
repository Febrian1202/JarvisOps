# Fase 7a — Foundation, Dependencies, & Theme System (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Setiap task memiliki langkah `- [ ]` yang harus dieksekusi secara atomic dan diakhiri dengan commit.
> - **Untuk developer manusia:** Sub-tahap ini menyiapkan infrastruktur package, font, konfigurasi Tailwind v4 theme warm-neutral, Vitest test runner, serta pustaka baseline komponen shadcn/ui. Ikuti setiap langkah secara berurutan.

**Goal:** Mempersiapkan seluruh pustaka dependensi frontend (shadcn/ui, Plus Jakarta Sans, TanStack Query, react-hook-form, zod, date-fns, Recharts, Vitest), mengonfigurasi tema token warna warm-neutral di `globals.css` sesuai `DESIGN.md` tanpa kebocoran dark mode, mengatur struktur direktori kerja di `apps/web/src`, dan menginstal 16 komponen dasar UI.

**Branch:** `feat/phase-7a-foundation`
**Estimasi Waktu:** ~1.0 hari (4 task)
**Prasyarat:** Fase 5 dan Fase 6 telah selesai dan merged ke `main`.

---

### Task 1: Update Dokumentasi Arsitektur & Sinkronisasi Rencana

**Files:**
- Modify: `docs/architecture/FRONTEND-ARCHITECTURE.md` (koreksi nama `proxy.ts` dari `middleware.ts`, referensi Next.js 16)
- Modify: `apps/web/package.json` (tambahkan script `typecheck`)

**Detail:**
Next.js 16 secara resmi mengganti konvensi berkas `middleware.ts` menjadi `proxy.ts` (walau `middleware.ts` masih kompatibel, proyek ini sudah menggunakan `src/proxy.ts` sejak Fase 2d). Dokumen arsitektur perlu disinkronkan agar tidak menimbulkan kebingungan bagi developer baru. Selain itu, script `"typecheck": "tsc --noEmit"` harus ditambahkan ke `package.json` sebagai gerbang pengecekan tipe statis.

- [ ] **Step 1: Update `docs/architecture/FRONTEND-ARCHITECTURE.md`**
  Perbarui bagian §4.3 (Next.js Middleware) menjadi `src/proxy.ts` (Next.js 16 Proxy Convention), jelaskan fungsinya sebagai penjaga rute berbasis cookie token `httpOnly`.
- [ ] **Step 2: Tambahkan script `typecheck` di `apps/web/package.json`**
  ```json
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
  ```
- [ ] **Step 3: Verifikasi lint & typecheck awal.**
  ```bash
  cd apps/web && npm run typecheck && npm run lint
  ```
- [ ] **Step 4: Commit.**
  ```bash
  git add docs/architecture/FRONTEND-ARCHITECTURE.md apps/web/package.json
  git commit -m "docs(frontend): sync proxy.ts naming and add typecheck script"
  ```

---

### Task 2: Instalasi Dependensi Inti & Setup Testing (Vitest)

**Files:**
- Modify: `apps/web/package.json` (tambah dependencies & devDependencies)
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/src/test/setup.ts`
- Create: `apps/web/src/test/test-utils.tsx`
- Create: `apps/web/src/test/smoke.test.ts`

**Detail:**
Instalasi seluruh dependensi yang telah dikunci di `ROADMAP.md` §2 dan keputusan brainstorming:
- Core UI & Icons: `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `@radix-ui/react-slot`, `@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-popover`, `@radix-ui/react-select`, `@radix-ui/react-tabs`, `@radix-ui/react-avatar`, `@radix-ui/react-separator`, `sonner`
- State & Forms: `@tanstack/react-query@^5`, `react-hook-form`, `@hookform/resolvers`, `zod`
- Date & Charts: `date-fns`, `recharts`
- Testing: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`

> **Catatan React 19:** Beberapa paket shadcn/radix mungkin memiliki peringatan peer dependency pada React 19. Gunakan flag `--force` atau `--legacy-peer-deps` jika npm memblokir instalasi.

- [ ] **Step 1: Jalankan perintah instalasi dependensi.**
  ```bash
  cd apps/web
  npm install @tanstack/react-query@^5 react-hook-form @hookform/resolvers zod date-fns recharts lucide-react clsx tailwind-merge class-variance-authority sonner
  npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom @types/node
  ```
- [ ] **Step 2: Konfigurasi `apps/web/vitest.config.ts`.**
  ```typescript
  import { defineConfig } from 'vitest/config';
  import react from '@vitejs/plugin-react';
  import path from 'path';

  export default defineConfig({
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  });
  ```
- [ ] **Step 3: Buat `apps/web/src/test/setup.ts` dan `apps/web/src/test/test-utils.tsx`.**
  `setup.ts`:
  ```typescript
  import '@testing-library/jest-dom';
  ```
  `test-utils.tsx` (menyediakan wrapper QueryClient untuk pengujian komponen):
  ```typescript
  import React, { ReactElement } from 'react';
  import { render, RenderOptions } from '@testing-library/react';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  const createTestQueryClient = () =>
    new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: Infinity,
        },
      },
    });

  export function renderWithProviders(
    ui: ReactElement,
    options?: Omit<RenderOptions, 'wrapper'>
  ) {
    const testQueryClient = createTestQueryClient();
    function Wrapper({ children }: { children: React.ReactNode }) {
      return (
        <QueryClientProvider client={testQueryClient}>
          {children}
        </QueryClientProvider>
      );
    }
    return render(ui, { wrapper: Wrapper, ...options });
  }
  ```
- [ ] **Step 4: Tambahkan smoke test `apps/web/src/test/smoke.test.ts`.**
  ```typescript
  import { describe, it, expect } from 'vitest';

  describe('Frontend Test Infrastructure Smoke Test', () => {
    it('runs vitest properly with typescript and assertions', () => {
      expect(1 + 1).toBe(2);
    });
  });
  ```
- [ ] **Step 5: Tambahkan script `"test": "vitest run"` di `package.json` dan jalankan test.**
  ```bash
  cd apps/web && npm run test
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add apps/web/package.json apps/web/package-lock.json apps/web/vitest.config.ts apps/web/src/test/
  git commit -m "feat(web): configure dependencies and vitest testing infrastructure"
  ```

---

### Task 3: Font Plus Jakarta Sans & Konfigurasi Desain Sistem Tailwind v4

**Files:**
- Modify: `apps/web/src/app/layout.tsx` (muat Plus Jakarta Sans via `next/font/google`, set `lang="id"`)
- Modify: `apps/web/src/app/globals.css` (konfigurasi `@theme inline`, palet warna warm-neutral, bersihkan dark mode)
- Create: `apps/web/src/lib/utils.ts` (fungsi `cn` helper)
- Create: `apps/web/components.json` (shadcn config)

**Detail:**
1. **Font:** Muat `Plus_Jakarta_Sans` dari `next/font/google` dengan bobot 400 (regular), 480 (opsional medium/500 jika 480 didukung variable font), dan 600 (semibold). Pasang variabel font ke root `<html>` atau `<body>`.
2. **Palet Warna (`globals.css`):**
   - Canvas/Background: `#f7f4ed` (warm cream)
   - Card/Surface/Off-White: `#fbfaf7`
   - Charcoal Primary Text: `#1c1c1c`
   - Muted Gray Text: `#5f5f5d`
   - Subtle Border/Divider: `#eceae4`
   - Active/Input Border (Kontras A11y 3:1): `rgba(28, 28, 28, 0.55)`
   - Focus Ring (A11y): `rgba(59, 130, 246, 0.5)` (Blue soft ring untuk `:focus-visible`)
   - Chart Colors 1–5: sequence warm-neutral (`#8c7b70`, `#5a6b7c`, `#7c8c6e`, `#b28259`, `#6d5b7b`)
   - Hapus blok `.dark` dan `prefers-color-scheme: dark` agar tidak ada kebocoran palet tak terdesain.
3. **Radius & Spacing:** `--radius: 0.375rem` (6px) sesuai DESIGN.md.

- [ ] **Step 1: Setup `apps/web/src/lib/utils.ts`.**
  ```typescript
  import { clsx, type ClassValue } from 'clsx';
  import { twMerge } from 'tailwind-merge';

  export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
  }
  ```
- [ ] **Step 2: Buat konfigurasi `apps/web/components.json` untuk shadcn CLI.**
  ```json
  {
    "$schema": "https://ui.shadcn.com/schema.json",
    "style": "new-york",
    "rsc": true,
    "tsx": true,
    "tailwind": {
      "config": "",
      "css": "src/app/globals.css",
      "baseColor": "neutral",
      "cssVariables": true
    },
    "aliases": {
      "components": "@/components",
      "utils": "@/lib/utils",
      "ui": "@/components/ui",
      "lib": "@/lib",
      "hooks": "@/hooks"
    },
    "iconLibrary": "lucide"
  }
  ```
- [ ] **Step 3: Update `apps/web/src/app/globals.css`.**
  ```css
  @import "tailwindcss";

  @theme inline {
    --font-sans: var(--font-jakarta), system-ui, -apple-system, sans-serif;
    --color-background: var(--background);
    --color-foreground: var(--foreground);
    --color-card: var(--card);
    --color-card-foreground: var(--card-foreground);
    --color-popover: var(--popover);
    --color-popover-foreground: var(--popover-foreground);
    --color-primary: var(--primary);
    --color-primary-foreground: var(--primary-foreground);
    --color-secondary: var(--secondary);
    --color-secondary-foreground: var(--secondary-foreground);
    --color-muted: var(--muted);
    --color-muted-foreground: var(--muted-foreground);
    --color-accent: var(--accent);
    --color-accent-foreground: var(--accent-foreground);
    --color-destructive: var(--destructive);
    --color-destructive-foreground: var(--destructive-foreground);
    --color-border: var(--border);
    --color-input: var(--input);
    --color-ring: var(--ring);
    --color-chart-1: var(--chart-1);
    --color-chart-2: var(--chart-2);
    --color-chart-3: var(--chart-3);
    --color-chart-4: var(--chart-4);
    --color-chart-5: var(--chart-5);
    --radius-sm: calc(var(--radius) - 2px);
    --radius-md: calc(var(--radius) - 1px);
    --radius-lg: var(--radius);
  }

  :root {
    --background: #f7f4ed;
    --foreground: #1c1c1c;
    --card: #fbfaf7;
    --card-foreground: #1c1c1c;
    --popover: #fbfaf7;
    --popover-foreground: #1c1c1c;
    --primary: #1c1c1c;
    --primary-foreground: #fbfaf7;
    --secondary: #eceae4;
    --secondary-foreground: #1c1c1c;
    --muted: #f0ede6;
    --muted-foreground: #5f5f5d;
    --accent: #eceae4;
    --accent-foreground: #1c1c1c;
    --destructive: #b91c1c;
    --destructive-foreground: #fbfaf7;
    --border: #eceae4;
    --input: rgba(28, 28, 28, 0.45);
    --ring: rgba(59, 130, 246, 0.5);
    --radius: 0.375rem;

    /* Chart colors in warm-neutral sequence */
    --chart-1: #8c7b70;
    --chart-2: #5a6b7c;
    --chart-3: #7c8c6e;
    --chart-4: #b28259;
    --chart-5: #6d5b7b;
  }

  @layer base {
    * {
      @apply border-border outline-ring/50;
    }
    body {
      @apply bg-background text-foreground font-sans antialiased;
    }
    /* WCAG 2.2 AA Focus appearance */
    :focus-visible {
      outline: 2px solid var(--ring);
      outline-offset: 2px;
    }
  }
  ```
- [ ] **Step 4: Update `apps/web/src/app/layout.tsx`.**
  ```tsx
  import type { Metadata } from 'next';
  import { Plus_Jakarta_Sans } from 'next/font/google';
  import './globals.css';

  const jakarta = Plus_Jakarta_Sans({
    subsets: ['latin'],
    variable: '--font-jakarta',
    weight: ['400', '500', '600', '700'],
    display: 'swap',
  });

  export const metadata: Metadata = {
    title: 'JARVIS OPS — IT Service Management',
    description: 'Platform manajemen tiket, aset, dan layanan IT perusahaan.',
  };

  export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="id" className={jakarta.variable}>
        <body className="min-h-screen bg-background text-foreground font-sans antialiased">
          {children}
        </body>
      </html>
    );
  }
  ```
- [ ] **Step 5: Verifikasi rendering font dan warna di dev mode.**
  ```bash
  cd apps/web && npm run typecheck
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add apps/web/src/app/globals.css apps/web/src/app/layout.tsx apps/web/src/lib/utils.ts apps/web/components.json
  git commit -m "feat(web): configure Plus Jakarta Sans font and warm-neutral theme tokens"
  ```

---

### Task 4: Setup Baseline Komponen UI shadcn

**Files:**
- Create: `apps/web/src/components/ui/button.tsx`
- Create: `apps/web/src/components/ui/input.tsx`
- Create: `apps/web/src/components/ui/select.tsx`
- Create: `apps/web/src/components/ui/textarea.tsx`
- Create: `apps/web/src/components/ui/table.tsx`
- Create: `apps/web/src/components/ui/dialog.tsx`
- Create: `apps/web/src/components/ui/dropdown-menu.tsx`
- Create: `apps/web/src/components/ui/badge.tsx`
- Create: `apps/web/src/components/ui/card.tsx`
- Create: `apps/web/src/components/ui/tabs.tsx`
- Create: `apps/web/src/components/ui/sonner.tsx`
- Create: `apps/web/src/components/ui/skeleton.tsx`
- Create: `apps/web/src/components/ui/pagination.tsx`
- Create: `apps/web/src/components/ui/avatar.tsx`
- Create: `apps/web/src/components/ui/popover.tsx`
- Create: `apps/web/src/components/ui/separator.tsx`
- Create: `apps/web/src/components/ui/form.tsx`
- Create: `apps/web/src/test/button.test.tsx`

**Detail:**
Implementasikan 16 komponen baseline shadcn/ui dengan penyesuaian wajib aturan `DESIGN.md`:
1. `button.tsx`: Tidak menggunakan `rounded-full` untuk button persegi. Menggunakan `h-9 px-4 py-2` (compact). Font semibold (`font-medium` atau `font-semibold`), dilarang `font-bold` (700+).
2. `card.tsx`: Menghilangkan `shadow-*` berlebih; gunakan border tipis `#eceae4` dan background `#fbfaf7`.
3. `badge.tsx`: Variasi visual warm-neutral (`default`, `secondary`, `destructive`, `outline`, `success`, `warning`).
4. `sonner.tsx`: Toaster kustom dengan gaya warm cream toast.

- [ ] **Step 1: Tulis unit test untuk `Button` component `apps/web/src/test/button.test.tsx`.**
  ```tsx
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import { Button } from '@/components/ui/button';

  describe('Button Component', () => {
    it('renders with children text', () => {
      render(<Button>Simpan</Button>);
      expect(screen.getByRole('button', { name: /simpan/i })).toBeInTheDocument();
    });

    it('applies variant classes correctly', () => {
      render(<Button variant="destructive">Hapus</Button>);
      const btn = screen.getByRole('button', { name: /hapus/i });
      expect(btn).toHaveClass('bg-destructive');
    });

    it('supports disabled state', () => {
      render(<Button disabled>Nonaktif</Button>);
      expect(screen.getByRole('button', { name: /nonaktif/i })).toBeDisabled();
    });
  });
  ```
- [ ] **Step 2: Jalankan test untuk melihat status (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/button.test.tsx
  ```
- [ ] **Step 3: Implementasikan berkas-berkas komponen di `apps/web/src/components/ui/`.**
  Pasang kode standar shadcn/ui untuk `button.tsx`, `input.tsx`, `badge.tsx`, `card.tsx`, `table.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `select.tsx`, `textarea.tsx`, `tabs.tsx`, `sonner.tsx`, `skeleton.tsx`, `pagination.tsx`, `avatar.tsx`, `popover.tsx`, `separator.tsx`, `form.tsx`.
- [ ] **Step 4: Jalankan test kembali untuk verifikasi (GREEN).**
  ```bash
  cd apps/web && npm run test
  ```
- [ ] **Step 5: Verifikasi typecheck dan lint.**
  ```bash
  cd apps/web && npm run typecheck && npm run lint
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add apps/web/src/components/ui/ apps/web/src/test/button.test.tsx
  git commit -m "feat(ui): add 16 baseline shadcn/ui components customized for warm-neutral theme"
  ```

---

## Exit Criteria 7a

- [ ] Seluruh dependensi (shadcn, Radix, TanStack Query, RHF, Zod, Date-fns, Recharts, Vitest) terpasang di `apps/web/package.json`.
- [ ] `vitest` berjalan lancar via `npm run test` dengan 100% test lulus.
- [ ] Plus Jakarta Sans aktif sebagai font default pada `<html>` dan `<body>`.
- [ ] `globals.css` memiliki seluruh token warna warm-neutral, variable `--radius: 0.375rem`, dan tidak ada blok `.dark`.
- [ ] 16 komponen `src/components/ui/` siap pakai tanpa error TypeScript.
- [ ] `npm run typecheck` (`tsc --noEmit`) dan `npm run lint` bersih.
