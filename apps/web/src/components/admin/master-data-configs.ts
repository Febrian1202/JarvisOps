import { z } from 'zod';
import { masterDataKeys } from '@/lib/query-keys';
import type { FormFieldDef, MasterDataConfig } from '@/components/shared/MasterDataPage';
import type { TicketCategory, TicketPriority } from '@/types/tickets';
import type { KnowledgeCategory } from '@/types/articles';

// ==========================================
// 1. Departemen
// ==========================================
export interface DepartmentItem {
  id: number;
  name: string;
  description: string | null;
  created_at?: string;
  updated_at?: string;
}

export const departmentSchema = z.object({
  name: z
    .string()
    .min(1, 'Nama departemen wajib diisi.')
    .max(100, 'Nama departemen maksimal 100 karakter.'),
  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter.')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const departmentFields: FormFieldDef[] = [
  {
    name: 'name',
    label: 'Nama Departemen',
    type: 'text',
    placeholder: 'Contoh: Information Technology',
    required: true,
  },
  {
    name: 'description',
    label: 'Deskripsi',
    type: 'textarea',
    placeholder: 'Deskripsi tugas dan tanggung jawab departemen…',
  },
];

export const departmentConfigBase: Omit<MasterDataConfig<DepartmentItem>, 'columns'> = {
  title: 'Departemen',
  description: 'Kelola unit dan departemen organisasi pengguna sistem.',
  endpoint: '/departments',
  queryKey: masterDataKeys.departments,
  formFields: departmentFields,
  zodSchema: departmentSchema,
  searchField: 'name',
  deleteMessage: 'Apakah Anda yakin ingin menghapus departemen ini? Data pengguna terkait mungkin terpengaruh.',
};

// ==========================================
// 2. Kategori Tiket (D-04 Tree Hierarchy)
// ==========================================
export const ticketCategorySchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nama kategori tiket wajib diisi.')
      .max(100, 'Nama kategori tiket maksimal 100 karakter.'),
    description: z
      .string()
      .max(500, 'Deskripsi maksimal 500 karakter.')
      .optional()
      .nullable()
      .transform((val) => (val === '' ? null : val)),
    parent_id: z
      .union([z.number().int(), z.literal(''), z.null()])
      .optional()
      .transform((val) => (val === '' || val === undefined ? null : val)),
  });

export function buildCategoryTreeOptions(
  categories: TicketCategory[],
  editingId: number | null
): { value: string; label: string }[] {
  // Filter out self and any descendants of editingId to prevent cycles
  const getDescendantIds = (parentId: number): Set<number> => {
    const descendants = new Set<number>();
    const stack = [parentId];
    while (stack.length > 0) {
      const current = stack.pop()!;
      for (const cat of categories) {
        if (cat.parent_id === current && !descendants.has(cat.id)) {
          descendants.add(cat.id);
          stack.push(cat.id);
        }
      }
    }
    return descendants;
  };

  const excludedIds = editingId ? getDescendantIds(editingId) : new Set<number>();
  if (editingId) excludedIds.add(editingId);

  const available = categories.filter((c) => !excludedIds.has(c.id));

  // Build tree indent labels
  const getDepth = (cat: TicketCategory): number => {
    let depth = 0;
    let curr = cat;
    while (curr.parent_id) {
      const parent = categories.find((c) => c.id === curr.parent_id);
      if (!parent || parent.id === curr.id) break;
      depth += 1;
      curr = parent;
    }
    return depth;
  };

  const options: { value: string; label: string }[] = [
    { value: 'NONE', label: '— Tanpa Induk (Kategori Utama) —' },
  ];

  for (const cat of available) {
    const depth = getDepth(cat);
    const prefix = depth > 0 ? `${'— '.repeat(depth)} ` : '';
    options.push({
      value: String(cat.id),
      label: `${prefix}${cat.name}`,
    });
  }

  return options;
}

export const ticketCategoryConfigBase: Omit<MasterDataConfig<TicketCategory>, 'columns'> = {
  title: 'Kategori Tiket',
  description: 'Kelola kategori dan sub-kategori layanan untuk pengelompokan tiket kendala.',
  endpoint: '/ticket-categories',
  queryKey: masterDataKeys.ticketCategories,
  formFields: (items, editingItem) => [
    {
      name: 'name',
      label: 'Nama Kategori',
      type: 'text',
      placeholder: 'Contoh: Jaringan & Konektivitas',
      required: true,
    },
    {
      name: 'parent_id',
      label: 'Kategori Induk',
      type: 'select',
      placeholder: 'Pilih kategori induk…',
      options: buildCategoryTreeOptions(items, editingItem?.id ?? null),
    },
    {
      name: 'description',
      label: 'Deskripsi',
      type: 'textarea',
      placeholder: 'Deskripsi ruang lingkup kendala dalam kategori ini…',
    },
  ],
  zodSchema: ticketCategorySchema,
  searchField: 'name',
  deleteMessage: 'Apakah Anda yakin ingin menghapus kategori tiket ini? Tiket yang memakai kategori ini tidak dapat dihapus jika masih terkait.',
  transformToForm: (item: TicketCategory) => ({
    name: item.name,
    description: item.description ?? '',
    parent_id: item.parent_id ?? null,
  }),
};

// ==========================================
// 3. Kategori Basis Pengetahuan
// ==========================================
export const knowledgeCategorySchema = z.object({
  name: z
    .string()
    .min(1, 'Nama kategori basis pengetahuan wajib diisi.')
    .max(100, 'Nama kategori maksimal 100 karakter.'),
  description: z
    .string()
    .max(255, 'Deskripsi maksimal 255 karakter.')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const knowledgeCategoryFields: FormFieldDef[] = [
  {
    name: 'name',
    label: 'Nama Kategori',
    type: 'text',
    placeholder: 'Contoh: Akses & Autentikasi',
    required: true,
  },
  {
    name: 'description',
    label: 'Deskripsi',
    type: 'textarea',
    placeholder: 'Topik panduan yang tercakup dalam kategori ini…',
  },
];

export const knowledgeCategoryConfigBase: Omit<MasterDataConfig<KnowledgeCategory>, 'columns'> = {
  title: 'Kategori Basis Pengetahuan',
  description: 'Kelola taksonomi kategori artikel bantuan dan dokumentasi mandiri.',
  endpoint: '/knowledge-categories',
  queryKey: masterDataKeys.knowledgeCategories,
  formFields: knowledgeCategoryFields,
  zodSchema: knowledgeCategorySchema,
  searchField: 'name',
  deleteMessage: 'Apakah Anda yakin ingin menghapus kategori artikel ini?',
};

// ==========================================
// 4. Prioritas Tiket & SLA
// ==========================================
export const ticketPrioritySchema = z.object({
  name: z
    .string()
    .min(1, 'Nama prioritas wajib diisi.')
    .max(50, 'Nama prioritas maksimal 50 karakter.'),
  level: z.coerce
    .number({ message: 'Tingkat urgensi wajib berupa angka.' })
    .int('Tingkat urgensi harus berupa bilangan bulat.')
    .min(1, 'Tingkat urgensi minimal 1.'),
  sla_minutes: z.coerce
    .number({ message: 'Target SLA wajib berupa angka.' })
    .int('Target SLA harus berupa bilangan bulat.')
    .min(1, 'Target SLA minimal 1 menit.'),
  description: z
    .string()
    .max(500, 'Deskripsi maksimal 500 karakter.')
    .optional()
    .nullable()
    .transform((val) => (val === '' ? null : val)),
});

export const ticketPriorityFields: FormFieldDef[] = [
  {
    name: 'name',
    label: 'Nama Prioritas',
    type: 'text',
    placeholder: 'Contoh: Kritis (Critical)',
    required: true,
  },
  {
    name: 'level',
    label: 'Tingkat Urgensi (Level)',
    type: 'number',
    placeholder: '1 (Tertinggi) s/d 4 (Terendah)',
    required: true,
  },
  {
    name: 'sla_minutes',
    label: 'Target SLA (Menit)',
    type: 'number',
    placeholder: 'Contoh: 120 (untuk 2 jam)',
    required: true,
    hint: 'Perubahan target SLA hanya berlaku untuk tiket baru.',
  },
  {
    name: 'description',
    label: 'Deskripsi Kriteria',
    type: 'textarea',
    placeholder: 'Kriteria dampak bisnis dan contoh kendala…',
  },
];

export const ticketPriorityConfigBase: Omit<MasterDataConfig<TicketPriority>, 'columns'> = {
  title: 'Prioritas Tiket',
  description: 'Pengaturan tingkat urgensi tiket dan target waktu penyelesaian SLA (Service Level Agreement).',
  endpoint: '/ticket-priorities',
  queryKey: masterDataKeys.ticketPriorities,
  formFields: ticketPriorityFields,
  zodSchema: ticketPrioritySchema,
  searchField: 'name',
  deleteMessage: 'Apakah Anda yakin ingin menghapus tingkat prioritas ini?',
};
