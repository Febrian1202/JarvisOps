import { z } from 'zod';

export const profileSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Nama lengkap wajib diisi.')
    .max(150, 'Nama lengkap maksimal 150 karakter.'),
  phone: z
    .string()
    .max(20, 'Nomor telepon maksimal 20 karakter.')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Password saat ini wajib diisi.'),
    password: z
      .string()
      .min(8, 'Password baru minimal 8 karakter.')
      .regex(/[a-zA-Z]/, 'Password baru harus mengandung huruf.')
      .regex(/[0-9]/, 'Password baru harus mengandung angka.'),
    password_confirmation: z
      .string()
      .min(1, 'Konfirmasi password baru wajib diisi.'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Konfirmasi password baru tidak cocok.',
  });

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
