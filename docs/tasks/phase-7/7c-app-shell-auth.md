# Fase 7c — App Shell, Role-Based Navigation, & Auth Flow (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Setiap task memiliki langkah `- [ ]` yang harus dieksekusi secara atomic dan diakhiri dengan commit.
> - **Untuk developer manusia:** Sub-tahap ini menyusun struktur rute group `(auth)` dan `(app)`, membangun kerangka aplikasi (App Shell, Sidebar dinamis berbasis role, Topbar, User Menu), AuthProvider context, halaman Login baru berbasis RHF/zod/shadcn, penanganan ganti password paksa (`/ganti-password`), error boundaries global, serta placeholder untuk seluruh 15 rute yang ditetapkan di `PRODUCT.md`.

**Goal:** Menghadirkan antarmuka kerangka kerja (App Shell) yang responsif (desktop, tablet, mobile drawer), mengamankan navigasi dengan penyaringan menu sesuai role dan permission `can()`, mengintegrasikan TanStack Query provider, mengimplementasikan alur ganti password wajib (D-11), serta memastikan tidak ada rute yang menghasilkan error 404 liar.

**Branch:** `feat/phase-7c-app-shell`
**Estimasi Waktu:** ~1.25 hari (5 task)
**Prasyarat:** 7a (theme & components) dan 7b (API client & types) selesai.

---

### Task 1: Restrukturisasi Route Groups `(auth)` dan `(app)` & Query Provider

**Files:**
- Create: `apps/web/src/app/(auth)/layout.tsx`
- Create: `apps/web/src/app/(app)/layout.tsx`
- Create: `apps/web/src/components/providers/query-provider.tsx`
- Create: `apps/web/src/components/providers/auth-provider.tsx`
- Modify: `apps/web/src/proxy.ts` (perbarui matcher rute group)
- Delete/Move: `apps/web/src/app/dashboard/page.tsx` → `apps/web/src/app/(app)/page.tsx`

**Detail:**
1. Pisahkan layout autentikasi publik `(auth)` (tampilan kartu di tengah dengan background warm cream `#f7f4ed`) dan layout aplikasi utama `(app)` (Sidebar + Topbar + Content area).
2. Root dashboard diarahkan ke `/` (`apps/web/src/app/(app)/page.tsx`) sebagai titik temu yang nantinya bercabang per role di Fase 9.
3. Pasang `QueryProvider` dan `AuthProvider` di `(app)/layout.tsx` agar state server dan sesi pengguna tersedia di seluruh komponen anak.

- [ ] **Step 1: Buat `QueryProvider` di `apps/web/src/components/providers/query-provider.tsx`.**
  ```tsx
  'use client';

  import React, { useState } from 'react';
  import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

  export function QueryProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(
      () =>
        new QueryClient({
          defaultOptions: {
            queries: {
              staleTime: 30 * 1000, // 30 detik
              retry: 1,
              refetchOnWindowFocus: true,
            },
          },
        })
    );

    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  ```
- [ ] **Step 2: Buat `AuthProvider` & `useAuth` hook di `apps/web/src/components/providers/auth-provider.tsx`.**
  ```tsx
  'use client';

  import React, { createContext, useContext, useEffect } from 'react';
  import { useQuery } from '@tanstack/react-query';
  import { useRouter, usePathname } from 'next/navigation';
  import { apiFetch } from '@/lib/client/api';
  import { authKeys } from '@/lib/query-keys';
  import { UserProfile } from '@/types/auth';

  interface AuthContextType {
    user: UserProfile | null;
    isLoading: boolean;
    can: (ability: string) => boolean;
    hasRole: (role: string) => boolean;
    logout: () => Promise<void>;
  }

  const AuthContext = createContext<AuthContextType | undefined>(undefined);

  export function AuthProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();

    const { data: user, isLoading } = useQuery({
      queryKey: authKeys.me,
      queryFn: () => apiFetch<UserProfile>('/me'),
    });

    // Forced Password Change handler (D-11)
    useEffect(() => {
      if (user?.must_change_password && pathname !== '/ganti-password') {
        router.push('/ganti-password');
      }
    }, [user, pathname, router]);

    const can = (ability: string): boolean => {
      if (!user) return false;
      return user.permissions?.includes(ability) ?? false;
    };

    const hasRole = (role: string): boolean => {
      return user?.role?.name === role;
    };

    const logout = async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
      } catch (e) {
        router.push('/login');
      }
    };

    return (
      <AuthContext.Provider value={{ user: user ?? null, isLoading, can, hasRole, logout }}>
        {children}
      </AuthContext.Provider>
    );
  }

  export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
      throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
  }
  ```
- [ ] **Step 3: Konfigurasi `apps/web/src/app/(auth)/layout.tsx` dan `apps/web/src/app/(app)/layout.tsx`.**
  `(auth)/layout.tsx`:
  ```tsx
  import React from 'react';

  export default function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-4 sm:p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">JARVIS OPS</h1>
            <p className="text-sm text-muted-foreground">IT Service Management System</p>
          </div>
          {children}
        </div>
      </div>
    );
  }
  ```
- [ ] **Step 4: Update `apps/web/src/proxy.ts` (Next.js middleware guard).**
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';

  const PUBLIC_PATHS = ['/login', '/api/auth/login', '/favicon.ico'];

  export function proxy(request: NextRequest) {
    const token = request.cookies.get('jarvis_token')?.value;
    const { pathname } = request.nextUrl;

    const isPublic = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

    // Belum login & mencoba akses rute terproteksi
    if (!token && !isPublic && !pathname.startsWith('/api/')) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Sudah login & membuka login page
    if (token && pathname === '/login') {
      const homeUrl = new URL('/', request.url);
      return NextResponse.redirect(homeUrl);
    }

    return NextResponse.next();
  }

  export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
  };
  ```
- [ ] **Step 5: Verifikasi typecheck.**
  ```bash
  cd apps/web && npm run typecheck
  ```
- [ ] **Step 6: Commit.**
  ```bash
  git add apps/web/src/app/\(auth\)/ apps/web/src/app/\(app\)/ apps/web/src/components/providers/ apps/web/src/proxy.ts
  git commit -m "feat(shell): structure route groups and configure AuthProvider & QueryProvider"
  ```

---

### Task 2: Pembangunan Sidebar Responsif & Navigasi Role-Based

**Files:**
- Create: `apps/web/src/components/shell/app-sidebar.tsx`
- Create: `apps/web/src/components/shell/mobile-nav.tsx`
- Create: `apps/web/src/lib/navigation.ts`
- Create: `apps/web/src/test/navigation.test.ts`

**Detail:**
1. `navigation.ts`: Matriks konfigurasi seluruh menu aplikasi beserta ability penjaganya (`requiredAbility` atau `roles`).
2. `AppSidebar`: Sidebar desktop (lebar 260px, fixed/sticky, background `#fbfaf7`, border-r `#eceae4`, font semibold, item menu aktif bernuansa warm cream `#eceae4` dengan font text `#1c1c1c`). Menyaring menu secara otomatis via `can()`.
3. `MobileNav`: Drawer mobile (sheet Radix UI) yang memuat menu yang sama saat ukuran layar < 768px (NFR-003).

- [ ] **Step 1: Tulis unit test filtering navigasi `apps/web/src/test/navigation.test.ts` (TDD RED).**
  ```typescript
  import { describe, it, expect } from 'vitest';
  import { filterNavItems } from '@/lib/navigation';

  describe('Role-Based Navigation Filtering', () => {
    it('shows only employee allowed items for plain employee', () => {
      const employeePermissions = ['dashboard.employee', 'ticket.viewAny', 'asset.viewOwn', 'article.viewAny'];
      const items = filterNavItems(employeePermissions, 'employee');

      expect(items.some((i) => i.href === '/')).toBe(true);
      expect(items.some((i) => i.href === '/tickets')).toBe(true);
      expect(items.some((i) => i.href === '/my-assets')).toBe(true);
      expect(items.some((i) => i.href === '/admin/users')).toBe(false);
      expect(items.some((i) => i.href === '/assets')).toBe(false);
    });

    it('shows admin menu for administrator', () => {
      const adminPermissions = ['dashboard.admin', 'user.viewAny', 'audit-log.viewAny'];
      const items = filterNavItems(adminPermissions, 'administrator');

      expect(items.some((i) => i.href === '/admin/users')).toBe(true);
      expect(items.some((i) => i.href === '/admin/audit-logs')).toBe(true);
    });
  });
  ```
- [ ] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/navigation.test.ts
  ```
- [ ] **Step 3: Implementasikan `navigation.ts`, `app-sidebar.tsx`, dan `mobile-nav.tsx`.**
- [ ] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/web/src/lib/navigation.ts apps/web/src/components/shell/app-sidebar.tsx apps/web/src/components/shell/mobile-nav.tsx apps/web/src/test/navigation.test.ts
  git commit -m "feat(nav): implement role-based sidebar and mobile navigation drawer"
  ```

---

### Task 3: Topbar, User Menu, & Notification Bell Stub

**Files:**
- Create: `apps/web/src/components/shell/app-topbar.tsx`
- Create: `apps/web/src/components/shell/nav-user.tsx`
- Create: `apps/web/src/components/shell/notification-bell.tsx`

**Detail:**
1. `AppTopbar`: Header atas fixed (tinggi 56px, background `#fbfaf7`/blur, border-b `#eceae4`), memuat tombol toggle mobile hamburger, judul/breadcrumb halaman, `NotificationBell`, dan `NavUser`.
2. `NavUser`: Dropdown avatar pengguna di kanan atas menampilkan nama lengkap, email, badge role, tombol Profil (`/profile`), dan tombol Logout.
3. `NotificationBell`: Ikon lonceng dengan badge angka unread (dihubungkan dengan query ringan di 7e).

- [ ] **Step 1: Implementasikan `nav-user.tsx`, `notification-bell.tsx`, dan `app-topbar.tsx`.**
- [ ] **Step 2: Pasang AppTopbar & AppSidebar di `apps/web/src/app/(app)/layout.tsx`.**
  ```tsx
  import React from 'react';
  import { AppSidebar } from '@/components/shell/app-sidebar';
  import { AppTopbar } from '@/components/shell/app-topbar';
  import { AuthProvider } from '@/components/providers/auth-provider';
  import { QueryProvider } from '@/components/providers/query-provider';
  import { Toaster } from '@/components/ui/sonner';

  export default function AppLayout({ children }: { children: React.ReactNode }) {
    return (
      <QueryProvider>
        <AuthProvider>
          <div className="flex min-h-screen bg-background text-foreground">
            <AppSidebar />
            <div className="flex-1 flex flex-col md:pl-64">
              <AppTopbar />
              <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
                {children}
              </main>
            </div>
          </div>
          <Toaster />
        </AuthProvider>
      </QueryProvider>
    );
  }
  ```
- [ ] **Step 3: Verifikasi compile dan lint.**
  ```bash
  cd apps/web && npm run typecheck && npm run lint
  ```
- [ ] **Step 4: Commit.**
  ```bash
  git add apps/web/src/components/shell/ apps/web/src/app/\(app\)/layout.tsx
  git commit -m "feat(shell): assemble complete AppTopbar, NavUser dropdown, and AppLayout"
  ```

---

### Task 4: Halaman Login Modern (RHF + Zod) & Halaman Ganti Password Paksa

**Files:**
- Create: `apps/web/src/app/(auth)/login/page.tsx`
- Create: `apps/web/src/app/(auth)/ganti-password/page.tsx`
- Create: `apps/web/src/test/login-form.test.tsx`

**Detail:**
1. `(auth)/login/page.tsx`: Migrasikan form login sederhana Fase 2 menjadi form standar produksi menggunakan `react-hook-form`, schema validasi `zod` berbahasa Indonesia, tombol loading state, dan pemetaan error kredensial.
2. `(auth)/ganti-password/page.tsx`: Halaman ganti password wajib bagi user dengan `must_change_password: true`. Input `current_password`, `password`, `password_confirmation`, submit ke `PUT /api/proxy/me/password`. Setelah sukses, refresh profile dan redirect ke `/`.

- [ ] **Step 1: Tulis unit test render Form Login `apps/web/src/test/login-form.test.tsx` (TDD RED).**
  ```tsx
  import React from 'react';
  import { render, screen } from '@testing-library/react';
  import { describe, it, expect } from 'vitest';
  import LoginPage from '@/app/(auth)/login/page';

  describe('Login Page Form', () => {
    it('renders email, password inputs, and submit button', () => {
      render(<LoginPage />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /masuk/i })).toBeInTheDocument();
    });
  });
  ```
- [ ] **Step 2: Jalankan test (RED).**
  ```bash
  cd apps/web && npm run test -- src/test/login-form.test.tsx
  ```
- [ ] **Step 3: Implementasikan `(auth)/login/page.tsx` dan `(auth)/ganti-password/page.tsx`.**
- [ ] **Step 4: Jalankan test (GREEN) & typecheck.**
  ```bash
  cd apps/web && npm run test && npm run typecheck
  ```
- [ ] **Step 5: Commit.**
  ```bash
  git add apps/web/src/app/\(auth\)/login/page.tsx apps/web/src/app/\(auth\)/ganti-password/page.tsx apps/web/src/test/login-form.test.tsx
  git commit -m "feat(auth): implement production Login form and Forced Password Change flow"
  ```

---

### Task 5: Placeholder Pages (15 Rute PRODUCT.md) & Error Boundary Kustom

**Files:**
- Create: `apps/web/src/app/(app)/page.tsx` (Dashboard root placeholder)
- Create: `apps/web/src/app/(app)/tickets/page.tsx` (Ticket list placeholder - diisi di 7d)
- Create: `apps/web/src/app/(app)/my-assets/page.tsx`
- Create: `apps/web/src/app/(app)/assets/page.tsx`
- Create: `apps/web/src/app/(app)/knowledge/page.tsx`
- Create: `apps/web/src/app/(app)/notifications/page.tsx`
- Create: `apps/web/src/app/(app)/profile/page.tsx`
- Create: `apps/web/src/app/(app)/admin/users/page.tsx`
- Create: `apps/web/src/app/(app)/admin/departments/page.tsx`
- Create: `apps/web/src/app/(app)/admin/categories/page.tsx`
- Create: `apps/web/src/app/(app)/admin/knowledge-categories/page.tsx`
- Create: `apps/web/src/app/(app)/admin/priorities/page.tsx`
- Create: `apps/web/src/app/(app)/admin/audit-logs/page.tsx`
- Create: `apps/web/src/app/(app)/403/page.tsx` (Akses Ditolak)
- Create: `apps/web/src/app/not-found.tsx` (404 Not Found)
- Create: `apps/web/src/app/error.tsx` (Global React Error Boundary)

**Detail:**
Buat komponen placeholder seragam (`<PagePlaceholder title="..." description="..." />`) untuk seluruh 15 rute yang tercantum di `PRODUCT.md` §Halaman Aplikasi. Ini membuktikan integritas seluruh navigasi, layout wrapper, dan middleware tanpa satupun link yang menghasilkan halaman 404 rusak.

- [ ] **Step 1: Implementasikan `error.tsx`, `not-found.tsx`, `403/page.tsx`, dan seluruh rute placeholder.**
- [ ] **Step 2: Verifikasi build Next.js.**
  ```bash
  cd apps/web && npm run build
  ```
- [ ] **Step 3: Commit.**
  ```bash
  git add apps/web/src/app/\(app\)/ apps/web/src/app/error.tsx apps/web/src/app/not-found.tsx
  git commit -m "feat(routes): scaffold placeholder pages for all 15 app routes and error boundaries"
  ```

---

## Exit Criteria 7c

- [ ] Route groups `(auth)` dan `(app)` terpisah bersih dengan layout masing-masing.
- [ ] Sidebar otomatis menyaring link berdasarkan permissions role pengguna saat login.
- [ ] Mobile drawer terbuka mulus saat ukuran layar diperkecil ke 375px (NFR-003).
- [ ] Form login baru (RHF + Zod + shadcn) bekerja mulus memanggil `/api/auth/login`.
- [ ] User dengan `must_change_password: true` ter-redirect paksa ke `/ganti-password` dan dapat memperbarui password.
- [ ] Seluruh 15 rute aplikasi memiliki berkas `page.tsx` valid, `npm run build` sukses tanpa error 404.
