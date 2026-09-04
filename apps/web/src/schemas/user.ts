import { z } from 'zod';

// Nested `profile` object of the admin user forms. Distinct from
// `profileSchema` in `@/schemas/profile`, which validates the self-service
// profile page (`PUT /me`).
const userProfileSchema = z.object({
  employee_code: z
    .string()
    .max(50, 'Kode karyawan maksimal 50 karakter.')
    .optional(),
  phone: z.string().max(30, 'Nomor telepon maksimal 30 karakter.').optional(),
  position: z.string().max(100, 'Jabatan maksimal 100 karakter.').optional(),
  hire_date: z
    .string()
    .optional()
    .transform((val) => (val === '' ? undefined : val)),
});

export const createUserSchema = z
  .object({
    full_name: z
      .string()
      .min(1, 'Nama lengkap wajib diisi.')
      .max(150, 'Nama lengkap maksimal 150 karakter.'),
    email: z
      .string()
      .min(1, 'Email wajib diisi.')
      .email('Format email tidak valid.')
      .max(150, 'Email maksimal 150 karakter.'),
    password: z
      .string()
      .min(8, 'Password minimal 8 karakter.')
      .regex(/[a-zA-Z]/, 'Password harus mengandung huruf.')
      .regex(/[0-9]/, 'Password harus mengandung angka.'),
    password_confirmation: z.string().min(1, 'Konfirmasi password wajib diisi.'),
    role_id: z.coerce.number().int().min(1, 'Role wajib dipilih.'),
    department_id: z
      .union([z.coerce.number().int(), z.literal('')])
      .optional()
      .transform((val) => (val === '' || val === undefined ? null : val)),
    status: z.enum(['active', 'inactive'], {
      message: 'Status user tidak valid.',
    }),
    profile: userProfileSchema.optional(),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ['password_confirmation'],
    message: 'Konfirmasi password tidak cocok.',
  });

export type CreateUserFormData = z.input<typeof createUserSchema>;

export const updateUserSchema = z.object({
  full_name: z
    .string()
    .min(1, 'Nama lengkap wajib diisi.')
    .max(150, 'Nama lengkap maksimal 150 karakter.'),
  email: z
    .string()
    .min(1, 'Email wajib diisi.')
    .email('Format email tidak valid.')
    .max(150, 'Email maksimal 150 karakter.'),
  role_id: z
    .union([z.coerce.number().int(), z.literal('')])
    .optional()
    .transform((val) => (val === '' || val === undefined ? null : val)),
  department_id: z
    .union([z.coerce.number().int(), z.literal('')])
    .optional()
    .transform((val) => (val === '' || val === undefined ? null : val)),
  profile: userProfileSchema.optional(),
});

export type UpdateUserFormData = z.input<typeof updateUserSchema>;
