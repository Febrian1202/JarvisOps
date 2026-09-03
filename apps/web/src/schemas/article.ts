import { z } from 'zod';

export const articleSchema = z.object({
  title: z.string().min(1, 'Judul artikel wajib diisi.').max(200, 'Judul artikel maksimal 200 karakter.'),
  category_id: z.number({ message: 'Kategori artikel wajib dipilih.' }).int('Kategori artikel tidak valid.'),
  content: z.string().min(1, 'Konten artikel wajib diisi.'),
  status: z.enum(['draft', 'published'], { message: 'Status artikel harus draft atau published.' }).optional(),
});

export type ArticleFormData = z.infer<typeof articleSchema>;