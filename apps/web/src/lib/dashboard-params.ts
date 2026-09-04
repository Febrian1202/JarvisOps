export interface DashboardDateParams {
  date_from: string;
  date_to: string;
}

export type DashboardDateParamsInput =
  | URLSearchParams
  | { get: (k: string) => string | null }
  | { date_from?: string | null; date_to?: string | null }
  | null
  | undefined;

/**
 * Reads date range parameters (date_from, date_to) following Rule C11:
 * Date range filter requires BOTH `date_from` and `date_to`.
 * If only one is present or if both are empty/missing, omit query parameters (return undefined).
 */
export function buildDashboardParams(
  searchParams?: DashboardDateParamsInput
): DashboardDateParams | undefined {
  if (!searchParams) {
    return undefined;
  }

  let from: string | null = null;
  let to: string | null = null;

  if (typeof (searchParams as { get?: unknown }).get === 'function') {
    const getter = searchParams as { get: (k: string) => string | null };
    from = getter.get('date_from');
    to = getter.get('date_to');
  } else {
    const plain = searchParams as { date_from?: string | null; date_to?: string | null };
    from = plain.date_from ?? null;
    to = plain.date_to ?? null;
  }

  const cleanFrom = from ? from.trim() : '';
  const cleanTo = to ? to.trim() : '';

  if (cleanFrom.length > 0 && cleanTo.length > 0) {
    return {
      date_from: cleanFrom,
      date_to: cleanTo,
    };
  }

  return undefined;
}

/**
 * Builds a query string prefixing '?' only when both date_from and date_to are provided.
 */
export function toQueryString(params?: { date_from?: string; date_to?: string }): string {
  if (params?.date_from && params?.date_to) {
    const from = encodeURIComponent(params.date_from);
    const to = encodeURIComponent(params.date_to);
    return `?date_from=${from}&date_to=${to}`;
  }
  return '';
}
