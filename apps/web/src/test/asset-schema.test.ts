import { describe, it, expect } from 'vitest';
import { assetSchema, ASSET_FORM_STATUS_OPTIONS } from '@/schemas/asset';

describe('assetSchema', () => {
  const validAsset = {
    asset_tag: 'LPT-0001',
    name: 'ThinkPad T14',
    category: 'Laptop',
    brand: 'Lenovo',
    model: 'T14 Gen 3',
    serial_number: 'SN12345',
    purchase_date: '2025-01-10',
    status: 'available',
    notes: '',
  };

  it('validates a correct payload', () => {
    expect(assetSchema.safeParse(validAsset).success).toBe(true);
  });

  it('fails when required fields are missing', () => {
    const result = assetSchema.safeParse({ asset_tag: '', name: '', category: '', brand: '', model: '', serial_number: '', purchase_date: '', status: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors.asset_tag).toBeDefined();
      expect(errors.name).toBeDefined();
      expect(errors.brand).toBeDefined();
      expect(errors.model).toBeDefined();
      expect(errors.serial_number).toBeDefined();
      expect(errors.purchase_date).toBeDefined();
      expect(errors.status).toBeDefined();
    }
  });

  it('rejects purchase_date in the future', () => {
    const future = new Date();
    future.setDate(future.getDate() + 5);
    const data = { ...validAsset, purchase_date: future.toISOString().slice(0, 10) };
    const result = assetSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.purchase_date).toBeDefined();
    }
  });

  it('accepts assigned as a preserved status when editing', () => {
    const data = { ...validAsset, status: 'assigned' };
    // assigned is not selectable on the form dropdown, but must be accepted
    // as a value when editing an already-assigned asset.
    expect(assetSchema.safeParse(data).success).toBe(true);
  });

  it('exposes form status options that never include assigned', () => {
    expect(ASSET_FORM_STATUS_OPTIONS).toEqual(['available', 'maintenance', 'retired', 'lost']);
  });
});