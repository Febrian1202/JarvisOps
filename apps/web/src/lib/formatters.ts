export function formatDuration(minutes: number | null): string {
  if (minutes === null) {
    return '—';
  }

  const safeMinutes = Math.max(0, Math.floor(minutes));
  if (safeMinutes === 0) {
    return '0m';
  }

  const days = Math.floor(safeMinutes / 1440);
  const remainingAfterDays = safeMinutes % 1440;
  const hours = Math.floor(remainingAfterDays / 60);
  const mins = remainingAfterDays % 60;

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}h`);
  }
  if (hours > 0) {
    parts.push(`${hours}j`);
  }
  if (mins > 0) {
    parts.push(`${mins}m`);
  }

  return parts.length > 0 ? parts.join(' ') : '0m';
}

export function formatSlaRemaining(
  signedMinutes: number | null,
  finished: boolean = false
): string {
  if (finished) {
    return 'Selesai';
  }

  if (signedMinutes === null) {
    return '—';
  }

  if (signedMinutes >= 0) {
    return formatDuration(signedMinutes);
  }

  return `Terlambat ${formatDuration(Math.abs(signedMinutes))}`;
}
