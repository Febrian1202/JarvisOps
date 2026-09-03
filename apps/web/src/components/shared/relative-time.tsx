import React from 'react';
import { formatDistanceToNow, format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';

interface RelativeTimeProps {
  date: string | Date;
  className?: string;
}

export function RelativeTime({ date, className }: RelativeTimeProps) {
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;

  if (isNaN(parsedDate.getTime())) {
    return <span className={className}>-</span>;
  }

  const relativeText = formatDistanceToNow(parsedDate, {
    addSuffix: true,
    locale: id,
  });

  // WIB full absolute format
  const absoluteText = format(parsedDate, 'd MMMM yyyy, HH:mm', {
    locale: id,
  }) + ' WIB';

  return (
    <time
      dateTime={parsedDate.toISOString()}
      title={absoluteText}
      className={className}
    >
      {relativeText}
    </time>
  );
}
