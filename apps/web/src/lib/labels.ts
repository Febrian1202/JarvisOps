import type {
  TicketStatusName,
  SlaStatus,
  TicketAction,
} from '@/types/tickets';
import type { RoleName } from '@/types/auth';
import type { AssetStatus } from '@/types/assets';
import type { ArticleStatus } from '@/types/articles';
import type { NotificationType } from '@/types/notifications';
import type { AuditAction, AuditModule } from '@/types/audit';

export function getTicketStatusLabel(status: TicketStatusName | string): string {
  switch (status) {
    case 'OPEN':
      return 'Menunggu';
    case 'ASSIGNED':
      return 'Ditugaskan';
    case 'IN_PROGRESS':
      return 'Sedang Dikerjakan';
    case 'RESOLVED':
      return 'Selesai';
    case 'CLOSED':
      return 'Ditutup';
    default:
      return status;
  }
}

export function getPriorityLabel(priority: string): string {
  switch (priority.toLowerCase()) {
    case 'critical':
      return 'Kritis';
    case 'high':
      return 'Tinggi';
    case 'medium':
      return 'Sedang';
    case 'low':
      return 'Rendah';
    default:
      return priority;
  }
}

export function getRoleLabel(role: RoleName | string): string {
  switch (role) {
    case 'administrator':
      return 'Administrator';
    case 'manager':
      return 'Manager';
    case 'technician':
      return 'Teknisi';
    case 'employee':
      return 'Karyawan';
    default:
      return role;
  }
}

export function getSlaStatusLabel(status: SlaStatus | string): string {
  switch (status) {
    case 'on_track':
      return 'Tepat Waktu';
    case 'breached':
      return 'Terlambat (Breach)';
    default:
      return status;
  }
}

export function getAssetStatusLabel(status: AssetStatus | string): string {
  switch (status) {
    case 'available':
      return 'Tersedia';
    case 'assigned':
      return 'Digunakan';
    case 'maintenance':
      return 'Perawatan';
    case 'retired':
      return 'Pensiun';
    case 'lost':
      return 'Hilang';
    default:
      return status;
  }
}

export function getArticleStatusLabel(status: ArticleStatus | string): string {
  switch (status) {
    case 'published':
      return 'Dipublikasikan';
    case 'draft':
      return 'Draf';
    default:
      return status;
  }
}

export function getNotificationTypeLabel(type: NotificationType | string): string {
  switch (type) {
    case 'TICKET_ASSIGNED':
      return 'Tiket Ditugaskan';
    case 'TICKET_REASSIGNED':
      return 'Tiket Dialihkan';
    case 'TICKET_UNASSIGNED':
      return 'Penugasan Tiket Dibatalkan';
    case 'TICKET_STATUS_CHANGED':
      return 'Status Tiket Berubah';
    case 'TICKET_SELF_ASSIGNED':
      return 'Tiket Diambil Teknisi';
    case 'TICKET_REOPENED':
      return 'Tiket Dibuka Kembali';
    case 'TICKET_RESOLVED':
      return 'Tiket Telah Selesai';
    case 'TICKET_CLOSED':
      return 'Tiket Ditutup';
    case 'TICKET_CANCELLED':
      return 'Tiket Dibatalkan';
    case 'TICKET_COMMENTED':
      return 'Komentar Baru';
    case 'TICKET_SLA_BREACHED':
      return 'SLA Tiket Terlampaui';
    default:
      return type;
  }
}

export function getTicketActionLabel(action: TicketAction | string): string {
  switch (action) {
    case 'assign':
      return 'Tugaskan';
    case 'unassign':
      return 'Lepas Tugas';
    case 'start':
      return 'Mulai Kerjakan';
    case 'resolve':
      return 'Selesaikan Tiket';
    case 'close':
      return 'Tutup Tiket';
    case 'cancel':
      return 'Batalkan Tiket';
    case 'reopen':
      return 'Buka Kembali';
    case 'change_priority':
      return 'Ubah Prioritas';
    case 'comment':
      return 'Beri Komentar';
    case 'attach':
      return 'Unggah Lampiran';
    case 'edit':
      return 'Edit Tiket';
    default:
      return action;
  }
}

export function getAuditActionLabel(action: AuditAction | string): string {
  switch (action) {
    case 'create':
      return 'Membuat';
    case 'update':
      return 'Memperbarui';
    case 'delete':
      return 'Menghapus';
    case 'assign':
      return 'Menugaskan';
    case 'reassign':
      return 'Mengalihkan';
    case 'unassign':
      return 'Membatalkan Tugas';
    case 'self_assign':
      return 'Mengambil Tugas';
    case 'status_change':
      return 'Mengubah Status';
    case 'priority_change':
      return 'Mengubah Prioritas';
    case 'reopen':
      return 'Membuka Kembali';
    case 'resolve':
      return 'Menyelesaikan';
    case 'close':
      return 'Menutup';
    case 'cancel':
      return 'Membatalkan';
    case 'login':
      return 'Masuk Sesi';
    case 'logout':
      return 'Keluar Sesi';
    case 'password_reset':
      return 'Reset Password';
    case 'sla_breach':
      return 'Pelanggaran SLA';
    case 'release':
      return 'Melepas Aset';
    case 'publish':
      return 'Mempublikasikan';
    case 'unpublish':
      return 'Menarik Publikasi';
    case 'activate':
      return 'Mengaktifkan';
    case 'deactivate':
      return 'Menonaktifkan';
    default:
      return action;
  }
}

export function getAuditModuleLabel(module: AuditModule | string): string {
  switch (module) {
    case 'ticket':
      return 'Tiket';
    case 'asset':
      return 'Aset';
    case 'article':
      return 'Basis Pengetahuan';
    case 'user':
      return 'Pengguna';
    case 'role':
      return 'Peran';
    case 'department':
      return 'Departemen';
    case 'ticket_category':
      return 'Kategori Tiket';
    case 'ticket_priority':
      return 'Prioritas Tiket';
    case 'knowledge_category':
      return 'Kategori Pengetahuan';
    case 'auth':
      return 'Autentikasi';
    default:
      return module;
  }
}

export const errorMessages: Record<number, string> = {
  403: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
  404: 'Halaman yang Anda cari tidak ditemukan.',
  409: 'Data sudah diubah oleh pihak lain. Silakan muat ulang.',
  429: 'Terlalu banyak permintaan. Silakan tunggu beberapa saat.',
  500: 'Terjadi kesalahan server. Silakan coba lagi.',
};

export const slaLabels = {
  on_track: 'On Track',
  breached: 'SLA Terlambat',
  resolved: 'Selesai',
};

export const attachmentLabels = {
  upload: 'Unggah Lampiran',
  maxSize: 'Maksimal 5 MB per file',
  allowedFormats: 'Format: .jpg, .jpeg, .png, .pdf',
  delete: 'Hapus',
  download: 'Unduh',
  uploading: 'Mengunggah...',
};

export const auditModuleLabels: Record<string, string> = {
  ticket: 'Ticket',
  asset: 'Aset',
  article: 'Artikel',
  knowledge_category: 'Kategori Pengetahuan',
  ticket_category: 'Kategori Ticket',
  ticket_priority: 'Prioritas Ticket',
  department: 'Departemen',
  user: 'Pengguna',
  login: 'Login',
  notification: 'Notifikasi',
};

export const auditActionLabels: Record<string, string> = {
  create: 'Membuat',
  update: 'Mengubah',
  delete: 'Menghapus',
  login: 'Login',
  logout: 'Logout',
  assign: 'Menugaskan',
  unassign: 'Melepas Tugas',
  status_change: 'Mengubah Status',
  priority_change: 'Mengubah Prioritas',
  comment: 'Berkomentar',
  upload: 'Mengunggah',
  download: 'Mengunduh',
  publish: 'Menerbitkan',
  unpublish: 'Menarik',
  activate: 'Mengaktifkan',
  deactivate: 'Menonaktifkan',
  reset_password: 'Reset Password',
  transition: 'Transisi Status',
  release: 'Melepas Aset',
  bulk_update: 'Ubah Massal',
  import: 'Impor',
  export: 'Ekspor',
};

export const assetStatusLabels: Record<string, string> = {
  available: 'Tersedia',
  assigned: 'Ditugaskan',
  maintenance: 'Perbaikan',
  retired: 'Pensiun',
  lost: 'Hilang',
};

export const articleStatusLabels: Record<string, string> = {
  draft: 'Draf',
  published: 'Terbit',
};

export const userStatusLabels: Record<string, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
};

export const activityFieldLabels: Record<string, string> = {
  status_id: 'Mengubah status',
  technician_id: 'Penugasan teknisi',
  priority_id: 'Mengubah prioritas',
  category_id: 'Mengubah kategori',
};

export function getActivityFieldLabel(field: string): string {
  return activityFieldLabels[field] || 'Memperbarui tiket';
}

export const chartSeriesLabels = {
  created: 'Ticket Dibuat',
  resolved: 'Ticket Selesai',
};

export const dashboardMetricLabels = {
  openTickets: 'Tiket Terbuka',
  resolvedTickets: 'Tiket Selesai',
  slaBreached: 'SLA Terlanggar',
  avgResolutionTime: 'Rata-rata Waktu Penyelesaian',
  compliance: 'Kepatuhan SLA',
  unassignedTickets: 'Tiket Belum Ditugaskan',
  activeAssets: 'Aset Aktif',
  totalUsers: 'Total Pengguna',
};

export const dashboardEmptyLabels = {
  activity: 'Belum ada aktivitas.',
  ticket: 'Belum ada tiket.',
  article: 'Belum ada artikel.',
  asset: 'Belum ada aset.',
};

export const emptyStateLabels = {
  dashboardActivity: dashboardEmptyLabels.activity,
  dashboardTicket: dashboardEmptyLabels.ticket,
  dashboardArticle: dashboardEmptyLabels.article,
  dashboardAsset: dashboardEmptyLabels.asset,
};

