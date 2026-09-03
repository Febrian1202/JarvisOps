import { describe, it, expect } from 'vitest';
import {
  getTicketStatusLabel,
  getPriorityLabel,
  getRoleLabel,
  getSlaStatusLabel,
  getNotificationTypeLabel,
  getAssetStatusLabel,
  getArticleStatusLabel,
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
});
