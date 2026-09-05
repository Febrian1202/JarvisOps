# Fase 11 — Mobile Responsive Layout & Touch Ergonomics (Rencana Implementasi)

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` (disarankan) atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Fase 11 difokuskan untuk menyempurnakan pengalaman antarmuka perangkat mobile (smartphone < 640px) pada seluruh fitur aplikasi yang sudah ada di v1.0.0.
>
> **Skill frontend wajib:** `impeccable`, `next-best-practices`, `vercel-react-best-practices`, `shadcn`, `frontend-design`, `tailwindcss-development`, `test-driven-development`. Muat skill-skill ini lewat tool `skill` sebelum menulis kode frontend.

**Goal:** Menjadikan JARVIS OPS nyaman dan ergonomis digunakan di ponsel (360px–430px) dengan transisi tabel ke card view, bottom sheet filter, sticky quick-actions untuk teknisi/karyawan, dan lulus uji Playwright mobile viewport.

**Basis asumsi:** Fase 10 (v1.0.0) selesai di `main`. Semua endpoint API backend sudah stabil dan tidak memerlukan perubahan skema.

**Branch:** `feat/phase-11<sub>` per sub-tahap, di-merge ke `main` via PR.
**Estimasi:** ~3–4 hari.
**Tag final:** `v1.1.0`.

---

## Peta sub-tahap

| Sub | Topik | File | Estimasi | Branch |
| --- | --- | --- | --- | --- |
| 11a | Shared Mobile Components & View Adapter | `11a-shared-mobile-components.md` | ~0,75 hari | `feat/phase-11a-shared-mobile` |
| 11b | Ticket & Asset Mobile Optimization | `11b-ticket-asset-mobile.md` | ~1,0 hari | `feat/phase-11b-tickets-assets-mobile` |
| 11c | Dashboard & Charts Mobile Ergonomics | `11c-dashboard-charts-mobile.md` | ~0,75 hari | `feat/phase-11c-dashboard-mobile` |
| 11d | Knowledge Base, Admin & Touch Hardening | `11d-kb-admin-mobile.md` | ~0,75 hari | `feat/phase-11d-kb-admin-mobile` |
| 11e | Mobile E2E Testing & Release Tag v1.1.0 | `11e-mobile-e2e-audit-tag.md` | ~0,5 hari | `feat/phase-11e-mobile-e2e-tag` |

---

## Prinsip Desain Mobile (Phase 11)

1. **Card View over Horizontal Scroll:** Tabel lebar dengan 7-10 kolom tidak praktis di layar 375px. `DataTable` harus secara cerdas merender kartu interaktif di mobile (`sm:hidden`) dan tabel desktop di (`hidden sm:block`).
2. **Bottom Sheet Filter (Thumb Zone):** Baris 5-6 dropdown filter memakan tinggi layar pertama. Sediakan satu tombol `Filter` ringkas yang membuka Sheet dari bawah layar.
3. **Sticky Action Bar:** Pada halaman detail tiket (`/tickets/[id]`), aksi utama teknisi/karyawan harus berada di bottom navigation bar mengambang yang mudah dijangkau satu tangan.
4. **Touch Target Size:** Semua tombol, ikon aksi, dan item form wajib memenuhi batas minimal WCAG 2.2 AA (44×44px hit-box).
