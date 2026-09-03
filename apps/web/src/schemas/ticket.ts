import { z } from 'zod';

export const ticketSchema = z.object({
  category_id: z
    .number({ required_error: 'Kategori wajib dipilih.' })
    .min(1, 'Kategori wajib dipilih.'),
  priority_id: z
    .number({ required_error: 'Prioritas wajib dipilih.' })
    .min(1, 'Prioritas wajib dipilih.'),
  asset_id: z.number().nullable().optional(),
  title: z
    .string({ required_error: 'Judul wajib diisi.' })
    .min(1, 'Judul wajib diisi.')
    .max(200, 'Judul maksimal 200 karakter.'),
  description: z
    .string({ required_error: 'Deskripsi wajib diisi.' })
    .min(1, 'Deskripsi wajib diisi.'),
});

export type TicketFormData = z.infer<typeof ticketSchema>;

