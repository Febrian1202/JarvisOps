export type AssetStatus = 'available' | 'assigned' | 'maintenance' | 'retired' | 'lost';

export interface ActiveAssetAssignment {
  id: number;
  user_id: number;
  full_name: string;
  notes?: string | null;
  assigned_at: string | null;
}

export interface AssetListItem {
  id: number;
  asset_tag: string;
  name: string;
  category: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  status: AssetStatus;
  purchase_date: string | null;
  current_assignment: {
    id: number;
    user_id: number;
    full_name: string;
    assigned_at: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface AssetDetail extends AssetListItem {
  notes: string | null;
  current_assignment: ActiveAssetAssignment | null;
}

export interface AssignableAsset {
  id: number;
  asset_tag: string;
  name: string;
  status: AssetStatus;
}

export interface AssetTimelineEvent {
  type: 'assignment' | 'history';
  action: string;
  user: { id: number; full_name: string } | null;
  notes: string | null;
  description?: string | null;
  occurred_at: string | null;
}
