import { z } from 'zod';
import type { AssetStatus } from '@/types/assets';

// Statuses the user can actively select on the form.
// `assigned` is managed by assign/release, but must be accepted as a
// preserved value when editing an already-assigned asset.
export const ASSET_FORM_STATUSES: readonly AssetStatus[] = [
  'available',
  'maintenance',
  'retired',
  'lost',
];

export const assetSchema = z
  .object({
    asset_tag: z.string().min(1, 'Tag aset wajib diisi.').max(50, 'Tag aset maksimal 50 karakter.'),
    name: z.string().min(1, 'Nama aset wajib diisi.').max(150, 'Nama aset maksimal 150 karakter.'),
    category: z.string().min(1, 'Kategori aset wajib diisi.').max(100, 'Kategori maksimal 100 karakter.'),
    brand: z.string().min(1, 'Merek aset wajib diisi.').max(100, 'Merek maksimal 100 karakter.'),
    model: z.string().min(1, 'Model aset wajib diisi.').max(100, 'Model maksimal 100 karakter.'),
    serial_number: z.string().min(1, 'Nomor seri wajib diisi.').max(150, 'Nomor seri maksimal 150 karakter.'),
    purchase_date: z.string().min(1, 'Tanggal pembelian wajib diisi.'),
    status: z.enum(['available', 'assigned', 'maintenance', 'retired', 'lost'], {
      message: 'Status aset tidak valid.',
    }),
    notes: z.string().optional(),
  })
  .refine((data) => !data.purchase_date || data.purchase_date <= new Date().toISOString().slice(0, 10), {
    path: ['purchase_date'],
    message: 'Tanggal pembelian tidak boleh di masa depan.',
  });

export type AssetFormData = z.infer<typeof assetSchema>;