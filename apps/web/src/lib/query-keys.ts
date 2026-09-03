export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
};

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...ticketKeys.lists(), filters] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: number) => [...ticketKeys.details(), id] as const,
  comments: (ticketId: number) =>
    [...ticketKeys.detail(ticketId), 'comments'] as const,
  histories: (ticketId: number) =>
    [...ticketKeys.detail(ticketId), 'histories'] as const,
  attachments: (ticketId: number) =>
    [...ticketKeys.detail(ticketId), 'attachments'] as const,
};

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...userKeys.all, 'list', filters] as const,
  detail: (id: number) => [...userKeys.all, 'detail', id] as const,
  assignable: (search?: string) =>
    [...userKeys.all, 'assignable', search] as const,
};

export const masterDataKeys = {
  departments: ['master-data', 'departments'] as const,
  ticketCategories: ['master-data', 'ticket-categories'] as const,
  knowledgeCategories: ['master-data', 'knowledge-categories'] as const,
  ticketPriorities: ['master-data', 'ticket-priorities'] as const,
};

export const assetKeys = {
  all: ['assets'] as const,
  lists: () => [...assetKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...assetKeys.lists(), filters] as const,
  myAssets: () => [...assetKeys.all, 'my-assets'] as const,
  my: (filters: Record<string, unknown> = {}) =>
    [...assetKeys.all, 'my', filters] as const,
  assignable: () => [...assetKeys.all, 'assignable'] as const,
  categories: ['assets', 'categories'] as const,
  details: () => [...assetKeys.all, 'detail'] as const,
  detail: (id: number) => [...assetKeys.details(), id] as const,
  history: (id: number) => [...assetKeys.detail(id), 'history'] as const,
};

export const articleKeys = {
  all: ['articles'] as const,
  lists: () => [...articleKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...articleKeys.lists(), filters] as const,
  details: () => [...articleKeys.all, 'detail'] as const,
  detail: (slugOrId: string | number) =>
    [...articleKeys.details(), slugOrId] as const,
  edit: (id: number) => [...articleKeys.all, 'edit', id] as const,
  categories: ['knowledge-categories'] as const,
};

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
};

export const auditKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown> = {}) =>
    [...auditKeys.lists(), filters] as const,
  detail: (id: number) => [...auditKeys.all, 'detail', id] as const,
};

export const dashboardKeys = {
  all: ['dashboard'] as const,
  employee: () => [...dashboardKeys.all, 'employee'] as const,
  technician: () => [...dashboardKeys.all, 'technician'] as const,
  manager: (params: Record<string, unknown> = {}) =>
    [...dashboardKeys.all, 'manager', params] as const,
  admin: (params: Record<string, unknown> = {}) =>
    [...dashboardKeys.all, 'admin', params] as const,
};

export const referenceKeys = {
  all: ['references'] as const,
  departments: () => [...referenceKeys.all, 'departments'] as const,
  ticketCategories: () => [...referenceKeys.all, 'ticket-categories'] as const,
  ticketPriorities: () => [...referenceKeys.all, 'ticket-priorities'] as const,
  ticketStatuses: () => [...referenceKeys.all, 'ticket-statuses'] as const,
  knowledgeCategories: () =>
    [...referenceKeys.all, 'knowledge-categories'] as const,
  technicians: () => [...referenceKeys.all, 'technicians'] as const,
  roles: () => [...referenceKeys.all, 'roles'] as const,
};
