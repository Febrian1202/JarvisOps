export interface ActionConfig {
  method: 'POST' | 'PUT' | 'DELETE';
  endpoint: (id: number | string) => string;
  dialog: 'assign' | 'confirm' | 'cancel' | 'priority' | 'edit' | 'none';
  payload?: Record<string, unknown>;
}

export const ACTION_MAP: Record<string, ActionConfig> = {
  assign: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/assign`,
    dialog: 'assign',
  },
  unassign: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/unassign`,
    dialog: 'confirm',
  },
  start: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/status`,
    dialog: 'confirm',
    payload: { status_id: 3 },
  },
  resolve: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/status`,
    dialog: 'confirm',
    payload: { status_id: 4 },
  },
  close: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/status`,
    dialog: 'confirm',
    payload: { status_id: 5 },
  },
  cancel: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/status`,
    dialog: 'cancel',
    payload: { status_id: 5 },
  },
  reopen: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/status`,
    dialog: 'confirm',
    payload: { status_id: 3 },
  },
  change_priority: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/priority`,
    dialog: 'priority',
  },
  comment: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/comments`,
    dialog: 'none',
  },
  attach: {
    method: 'POST',
    endpoint: (id) => `/api/proxy/tickets/${id}/attachments`,
    dialog: 'none',
  },
  edit: {
    method: 'PUT',
    endpoint: (id) => `/api/proxy/tickets/${id}`,
    dialog: 'edit',
  },
};
