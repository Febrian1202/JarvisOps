# Sub-tahap 8c — Detail Ticket, Timeline, & Aksi

> **Panduan Eksekusi:**
> - **Untuk agentic worker:** SUB-SKILL WAJIB — gunakan `superpowers:subagent-driven-development` atau `superpowers:executing-plans`. Langkah memakai `- [ ]`.
> - **Untuk developer manusia:** Sub-tahap ini membangun halaman detail ticket — yang paling kompleks di seluruh Fase 8. Perhatikan dengan saksama §Peta Aksi dan §Timeline di bawah; di sinilah keputusan K3, K4, K5, C1, C7 berlaku.

**Goal:** Halaman `/tickets/[id]` lengkap: banner + action bar, SLA tracker, timeline gabungan komentar+riwayat, form komentar (optimistic), kartu attachment (upload progress, download, hapus), kartu aset terkait, dan semua aksi status/prioritas/assign yang digerakkan `available_actions` dari backend.

**Branch:** `feat/phase-8c-ticket-detail`
**Estimasi:** ~1,5 hari
**Prasyarat:** 8b selesai (`action-to-endpoint.ts`, `useApiMutation`, `useUploadWithProgress`)

---

## Peta Aksi (`available_actions` → dialog/endpoint)

Frontend **tidak** menurunkan aksi dari `(status, role)`. Backend mengembalikan daftar aksi di `TicketResource.available_actions`. Tabel ini memetakan tiap aksi ke perilaku UI.

| Aksi | Endpoint | Payload | Dialog | Catatan |
|------|----------|---------|--------|---------|
| `assign` | `POST /tickets/{id}/assign` | `{ technician_id, note?, expected_status_id }` | Assign (pilih teknisi) | Teknisi dari `/api/technicians` |
| `unassign` | `POST /tickets/{id}/unassign` | (kosong) | Konfirmasi | Tidak kirim `expected_status_id` |
| `start` | `POST /tickets/{id}/status` | `{ status_id: 3, note?, expected_status_id }` | Konfirmasi | Mulai pengerjaan |
| `resolve` | `POST /tickets/{id}/status` | `{ status_id: 4, note?, expected_status_id }` | Konfirmasi + note opsional | Tandai selesai |
| `close` | `POST /tickets/{id}/status` | `{ status_id: 5, note?, expected_status_id }` | Konfirmasi | Tutup (dari RESOLVED) |
| `cancel` | `POST /tickets/{id}/status` | `{ status_id: 5, note (WAJIB), expected_status_id }` | Dialog khusus + note wajib | Batalkan (dari non-RESOLVED) |
| `reopen` | `POST /tickets/{id}/status` | `{ status_id: 3, note?, expected_status_id }` | Konfirmasi | Buka kembali |
| `change_priority` | `POST /tickets/{id}/priority` | `{ priority_id }` | Pilih prioritas | **TIDAK** kirim `expected_status_id` (D-26) |
| `comment` | `POST /tickets/{id}/comments` | `{ body }` | (langsung di timeline) | Optimistic update |
| `attach` | `POST /tickets/{id}/attachments` | multipart `file` | (kartu attachment) | Progress via XHR |
| `edit` | `PUT /tickets/{id}` | hanya field dari `editable_fields` | Dialog edit | Field terlarang → 422 |

**Perilaku aksi:**
1. **Status yang sama, konteks berbeda:** `cancel` dan `close` sama-sama mengirim `status_id: 5`, tapi `cancel` wajib `note`. Bedakan label tombol: "Batalkan" (dari status bukan RESOLVED) vs "Tutup Ticket" (dari RESOLVED).
2. **`expected_status_id`:** dikirim pada `/status` dan `/assign` — ambil dari `ticket.status.id` yang sedang terbuka. Bila backend menjawab **409**, tampilkan toast "Status tiket sudah diubah oleh pihak lain." dan refetch detail (invalidate `ticketKeys.detail`).
3. **`change_priority` tidak menerima `expected_status_id`** — jangan kirim (akan diabaikan, tapi tetap jangan mencampur logika).

---

## Task 1: Layout & banner halaman detail

**Files:**
- Create: `apps/web/src/app/(app)/tickets/[id]/page.tsx` (server shell)
- Create: `apps/web/src/app/(app)/tickets/[id]/page-client.tsx`
- Create: `apps/web/src/components/tickets/TicketDetailBanner.tsx`
- Create: `apps/web/src/components/tickets/SlaTracker.tsx`

**Detail:** Ikuti wireframe frame 08:
- **Banner:** `ticket_number`, `StatusBadge`, `PriorityBadge`, kategori, nama pelapor, tombol aksi (dari `available_actions`).
- **SLA Tracker:** bar progress = `elapsed / sla_duration_minutes` (di-clamp 0–100% untuk visual), label `Sisa N menit` atau `Terlambat N menit` (C15). Bila `sla_remaining_minutes` `null` (resolved/closed) → tampilkan status final, bukan bar.

> **Jebakan — `sla_status` vs `sla_remaining_minutes`:** Backend mengembalikan `sla_status` (`on_track|breached`) dan `sla_remaining_minutes` bertanda (negatif = terlambat). Gunakan `sla_remaining_minutes` untuk label ("Terlambat 45 menit") dan `sla_status` untuk warna. Jangan potong nilai negatif menjadi 0 pada label.

### Step 1 — RED:
```typescript
test('SlaTracker shows overdue minutes for negative remaining', () => {
  render(<SlaTracker duration={240} remaining={-45} />);
  expect(screen.getByText('Terlambat 45 menit')).toBeInTheDocument();
});

test('SlaTracker hides bar when remaining is null', () => {
  render(<SlaTracker duration={240} remaining={null} />);
  expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
});
```

### Step 2 — GREEN: implementasi.

### Step 3 — REFACTOR & verifikasi:
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit:
```bash
git add apps/web/src/app/(app)/tickets/[id]/ apps/web/src/components/tickets/TicketDetailBanner.tsx apps/web/src/components/tickets/SlaTracker.tsx
git commit -m "feat(web): add ticket detail banner and SLA tracker"
```

---

## Task 2: Timeline gabungan (K5)

**Files:**
- Create: `apps/web/src/components/tickets/TicketTimeline.tsx`
- Create: `apps/web/src/components/tickets/timeline-merge.ts`
- Create: `apps/web/src/components/tickets/CommentForm.tsx`

**Detail:** Satu timeline "Riwayat Penanganan & Diskusi" yang menggabungkan:
- `GET /tickets/{id}/comments?per_page=100` (paginasi ASC)
- `GET /tickets/{id}/histories` (array polos ASC)

Di-merge client-side, diurutkan `created_at` ASC. Setiap entri:
- **History** → terjemahkan `field_changed` + `old_value`/`new_value` menjadi kalimat Indonesia manusiawi:
  - `status_id` → "Status diubah dari *Open* menjadi *Assigned*"
  - `technician_id` → "Teknisi diubah dari *—* menjadi *Budi Santoso*"
  - `priority_id` → "Prioritas diubah dari *Low* menjadi *High*"
  - `category_id` → "Kategori diubah dari *Software* menjadi *Hardware*"
  - `title` → "Judul diubah"
- **Comment** → tampilkan penulis + body + `RelativeTime`.

Form komentar di bawah timeline (hanya bila `available_actions` memuat `comment`): **optimistic update** — sisipkan komentar sementara (id negatif / `pending: true`), kirim POST, ganti dengan respons asli; bila gagal → rollback + toast (K3).

> **Jebakan — merge dua sumber:** `TicketCommentResource` dan `TicketHistoryResource` sama-sama punya `created_at`. Gabung dengan `[...comments, ...histories].sort((a,b) => a.created_at.localeCompare(b.created_at))`. Normalisasi ke satu tipe `TimelineEntry` di `timeline-merge.ts`. Jangan render pagination untuk komentar — `per_page=100` cukup (batas backend 100).
>
> **Jebakan — optimistic comment:** TanStack Query `onMutate` menyisipkan ke cache; `onError`/`onSettled` harus menghapus atau invalidate. Pastikan `queryKey` komentar = `ticketKeys.detail(id).comments` dan konsisten dengan key yang dipakai di `useQuery`.

### Step 1 — RED:
```typescript
test('timeline merge sorts comments and histories by created_at', () => {
  const merged = mergeTimeline([comment1, comment2], [history1]);
  expect(merged.map(m => m.created_at)).toEqual(sorted);
});

test('history field translation produces Indonesian sentence', () => {
  expect(translateHistory({ field_changed: 'status_id', old_value: '1', new_value: '2' }))
    .toContain('Status diubah');
});
```

### Step 2 — GREEN: implementasi `timeline-merge.ts`, `translateHistory`, `TicketTimeline.tsx`, `CommentForm.tsx`.

### Step 3 — REFACTOR & verifikasi:
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit:
```bash
git add apps/web/src/components/tickets/TicketTimeline.tsx apps/web/src/components/tickets/timeline-merge.ts apps/web/src/components/tickets/CommentForm.tsx
git commit -m "feat(web): add merged comment+history timeline with optimistic comments"
```

---

## Task 3: Kartu attachment (upload / download / hapus)

**Files:**
- Create: `apps/web/src/components/tickets/AttachmentCard.tsx`
- Create: `apps/web/src/components/tickets/AttachmentList.tsx`
- Create: `apps/web/src/lib/attachments.ts`

**Detail:** Kartu "Lampiran" di kolom kanan (frame 08):
- Daftar dari `GET /tickets/{id}/attachments` — kolom: nama file, ukuran, pengunggah, waktu.
- **Upload:** hanya bila `available_actions` memuat `attach`. Gunakan `useUploadWithProgress` (XHR, K10). Validasi klien: ukuran ≤ 5MB, tipe JPG/JPEG/PNG/PDF.
- **Download:** `<a href={attachmentDownloadUrl(a)} download>`. Rewrite `/api/attachments/{id}/download` → `/api/proxy/attachments/{id}/download`.
- **Hapus:** hanya bila `can('attachment.delete')` (Admin) **atau** pengunggah = user saat ini. `DELETE /tickets/{id}/attachments/{id}` — sebenarnya route delete adalah `DELETE /api/attachments/{attachment}`.

> **Jebakan — route delete:** Route hapus adalah `DELETE /api/attachments/{attachment}` (bukan di bawah `/tickets/{id}/...`). Perhatikan `routes/api.php`: `attachments.destroy`. Gunakan `DELETE /api/proxy/attachments/{id}`.
>
> **Jebakan — upload progress via XHR:** `useUploadWithProgress` mengirim `FormData` ke `/api/proxy/tickets/{id}/attachments` via `XMLHttpRequest`, membaca `xhr.upload.onprogress` untuk persentase. Tangani `status 429` (`throttle:upload` 20/menit) → toast `Retry-After`.

### Step 1 — RED:
```typescript
test('attachmentDownloadUrl rewrites API path to proxy path', () => {
  expect(attachmentDownloadUrl('/api/attachments/5/download'))
    .toBe('/api/proxy/attachments/5/download');
});
```

### Step 2 — GREEN: implementasi `attachments.ts`, `AttachmentList.tsx`, `AttachmentCard.tsx`.

### Step 3 — REFACTOR & verifikasi:
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit:
```bash
git add apps/web/src/lib/attachments.ts apps/web/src/components/tickets/AttachmentList.tsx apps/web/src/components/tickets/AttachmentCard.tsx
git commit -m "feat(web): add attachment card with XHR progress upload, proxy download, and delete"
```

---

## Task 4: Dialog & aksi (assign, status, priority, edit, delete)

**Files:**
- Create: `apps/web/src/components/tickets/action-dialogs.tsx`
- Create: `apps/web/src/components/tickets/use-ticket-actions.ts`
- Modify: `apps/web/src/app/(app)/tickets/[id]/page-client.tsx`

**Detail:** Render tombol aksi dari `available_actions` (Peta Aksi di atas). Setiap aksi membuka dialog yang sesuai.

**Assign dialog:**
- Select teknisi dari `/api/technicians` (hanya M/A; untuk Technician `available_actions` tidak akan memuat `assign` kecuali sebagai admin/manager).
- Input `note` opsional.
- Kirim `{ technician_id, note, expected_status_id }`.

**Status dialog (start/resolve/close/reopen):**
- Konfirmasi + textarea `note` opsional (kecuali `cancel` → note wajib).
- Kirim `{ status_id, note?, expected_status_id }`.
- **409 handling:** toast + refetch (K4).

**Cancel dialog:**
- `note` **wajib** (STATUS-TRANSITION §4.3). Disable tombol "Batalkan Ticket" hingga note terisi.
- Kirim `{ status_id: 5, note, expected_status_id }`.

**Priority dialog:**
- Select prioritas dari `/api/ticket-priorities`.
- Kirim `{ priority_id }` — **tanpa** `expected_status_id` (C14).

**Edit dialog:**
- Hanya field yang ada di `editable_fields` (`title`, `description`, `category_id`).
- `PUT /tickets/{id}` — jangan kirim field terlarang (C13).
- Kategori dari `/api/ticket-categories`.

**Delete (Admin only, C7):**
- Tombol "Hapus Ticket" dirender dari `can('ticket.delete')`, bukan dari `available_actions`.
- Konfirmasi → `DELETE /tickets/{id}` → redirect ke `/tickets`.

> **Jebakan — 409 vs 422:** Semua aksi yang menyentuh `/status` dan `/assign` wajib mengirim `expected_status_id`. 409 dari backend artinya data sudah berubah — jangan tampilkan sebagai 422. Pisahkan penanganan di `useApiMutation`: `error.status === 409` → toast khusus + invalidate; `error.status === 422` → map ke form.
>
> **Jebakan — `cancel` butuh note:** Jangan sampai dialog `cancel` bisa disubmit kosong. Gunakan `zod` `note.min(1)` di dialog + tombol disabled.

### Step 1 — RED:
```typescript
test('cancel dialog requires note before submit', async () => {
  render(<ActionDialogs actions={['cancel']} ticket={ticket} />);
  fireEvent.click(screen.getByText('Batalkan Ticket'));
  expect(screen.getByRole('button', { name: /batalkan/i })).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Catatan'), { target: { value: 'alasan' } });
  expect(screen.getByRole('button', { name: /batalkan/i })).toBeEnabled();
});
```

### Step 2 — GREEN: implementasi `use-ticket-actions.ts` (state dialog + mutation per aksi) dan `action-dialogs.tsx`.

### Step 3 — REFACTOR & verifikasi:
```bash
cd apps/web && npm run test && npx tsc --noEmit && npm run lint
```

### Step 4 — Commit:
```bash
git add apps/web/src/components/tickets/action-dialogs.tsx apps/web/src/components/tickets/use-ticket-actions.ts apps/web/src/app/(app)/tickets/[id]/page-client.tsx
git commit -m "feat(web): add ticket action dialogs (assign, status, priority, edit, delete) with 409 handling"
```

---

## Exit Criteria 8c

- [ ] Halaman `/tickets/[id]` menampilkan banner + action bar dari `available_actions`.
- [ ] SLA Tracker menampilkan sisa/terlambat benar; bar disembunyikan saat final.
- [ ] Timeline gabungan komentar + riwayat, terjemahan Indonesia benar, urutan ASC.
- [ ] Form komentar optimistic update; gagal → rollback + toast.
- [ ] Kartu attachment: upload progress (XHR), download via proxy, hapus (Admin/pengunggah).
- [ ] `expected_status_id` dikirim pada `/status` & `/assign`; 409 → toast + refetch.
- [ ] `cancel` mewajibkan `note`; `change_priority` tidak mengirim `expected_status_id`.
- [ ] Edit dialog hanya mengirim `editable_fields`.
- [ ] Tombol hapus (Admin) dari `can('ticket.delete')`.
- [ ] `npm run test`, `npx tsc --noEmit`, `npm run lint` hijau.