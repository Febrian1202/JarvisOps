import { describe, it, expect } from 'vitest';
import {
  getTicketStatusLabel,
  getPriorityLabel,
  getRoleLabel,
  getSlaStatusLabel,
  getNotificationTypeLabel,
  getAssetStatusLabel,
  getArticleStatusLabel,
  activityFieldLabels,
  getActivityFieldLabel,
  chartSeriesLabels,
  dashboardMetricLabels,
  dashboardEmptyLabels,
  emptyStateLabels,
} from '@/lib/labels';

describe('Indonesian Label Dictionary', () => {
  it('translates ticket statuses correctly', () => {
    expect(getTicketStatusLabel('OPEN')).toBe('Menunggu');
    expect(getTicketStatusLabel('ASSIGNED')).toBe('Ditugaskan');
    expect(getTicketStatusLabel('IN_PROGRESS')).toBe('Sedang Dikerjakan');
    expect(getTicketStatusLabel('RESOLVED')).toBe('Selesai');
    expect(getTicketStatusLabel('CLOSED')).toBe('Ditutup');
  });

  it('translates priority correctly', () => {
    expect(getPriorityLabel('Critical')).toBe('Kritis');
    expect(getPriorityLabel('High')).toBe('Tinggi');
    expect(getPriorityLabel('Medium')).toBe('Sedang');
    expect(getPriorityLabel('Low')).toBe('Rendah');
  });

  it('translates role names correctly', () => {
    expect(getRoleLabel('administrator')).toBe('Administrator');
    expect(getRoleLabel('manager')).toBe('Manager');
    expect(getRoleLabel('technician')).toBe('Teknisi');
    expect(getRoleLabel('employee')).toBe('Karyawan');
  });

  it('translates SLA status correctly', () => {
    expect(getSlaStatusLabel('on_track')).toBe('Tepat Waktu');
    expect(getSlaStatusLabel('breached')).toBe('Terlambat (Breach)');
  });

  it('translates asset status correctly', () => {
    expect(getAssetStatusLabel('available')).toBe('Tersedia');
    expect(getAssetStatusLabel('assigned')).toBe('Digunakan');
    expect(getAssetStatusLabel('maintenance')).toBe('Perawatan');
    expect(getAssetStatusLabel('retired')).toBe('Pensiun');
    expect(getAssetStatusLabel('lost')).toBe('Hilang');
  });

  it('translates article status correctly', () => {
    expect(getArticleStatusLabel('published')).toBe('Dipublikasikan');
    expect(getArticleStatusLabel('draft')).toBe('Draf');
  });

  it('translates notification types correctly', () => {
    expect(getNotificationTypeLabel('TICKET_ASSIGNED')).toBe('Tiket Ditugaskan');
    expect(getNotificationTypeLabel('TICKET_SLA_BREACHED')).toBe('SLA Tiket Terlampaui');
  });

  describe('Dashboard Activity & Metrics Labels', () => {
    it('translates activityFieldLabels correctly', () => {
      expect(activityFieldLabels['status_id']).toBe('Mengubah status');
      expect(activityFieldLabels['technician_id']).toBe('Penugasan teknisi');
      expect(activityFieldLabels['priority_id']).toBe('Mengubah prioritas');
      expect(activityFieldLabels['category_id']).toBe('Mengubah kategori');
    });

    it('returns fallback in getActivityFieldLabel when field is unknown', () => {
      expect(getActivityFieldLabel('status_id')).toBe('Mengubah status');
      expect(getActivityFieldLabel('technician_id')).toBe('Penugasan teknisi');
      expect(getActivityFieldLabel('priority_id')).toBe('Mengubah prioritas');
      expect(getActivityFieldLabel('category_id')).toBe('Mengubah kategori');
      expect(getActivityFieldLabel('unknown_field')).toBe('Memperbarui tiket');
      expect(getActivityFieldLabel('')).toBe('Memperbarui tiket');
    });

    it('has chartSeriesLabels for dashboard charts', () => {
      expect(chartSeriesLabels.created).toBe('Ticket Dibuat');
      expect(chartSeriesLabels.resolved).toBe('Ticket Selesai');
    });

    it('has dashboardMetricLabels for reusable metric titles', () => {
      expect(dashboardMetricLabels.openTickets).toBe('Tiket Terbuka');
      expect(dashboardMetricLabels.resolvedTickets).toBe('Tiket Selesai');
      expect(dashboardMetricLabels.slaBreached).toBe('SLA Terlanggar');
      expect(dashboardMetricLabels.avgResolutionTime).toBe('Rata-rata Waktu Penyelesaian');
      expect(dashboardMetricLabels.compliance).toBe('Kepatuhan SLA');
      expect(dashboardMetricLabels.unassignedTickets).toBe('Tiket Belum Ditugaskan');
    });

    it('has dashboardEmptyLabels for empty states', () => {
      expect(dashboardEmptyLabels.activity).toBe('Belum ada aktivitas.');
      expect(dashboardEmptyLabels.ticket).toBe('Belum ada tiket.');
      expect(dashboardEmptyLabels.article).toBe('Belum ada artikel.');
      expect(dashboardEmptyLabels.asset).toBe('Belum ada aset.');
    });

    it('has emptyStateLabels mapping for dashboard empty states', () => {
      expect(emptyStateLabels.dashboardActivity).toBe('Belum ada aktivitas.');
      expect(emptyStateLabels.dashboardTicket).toBe('Belum ada tiket.');
      expect(emptyStateLabels.dashboardArticle).toBe('Belum ada artikel.');
      expect(emptyStateLabels.dashboardAsset).toBe('Belum ada aset.');
    });
  });
});

