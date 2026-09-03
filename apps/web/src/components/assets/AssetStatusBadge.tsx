import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getAssetStatusLabel } from '@/lib/labels';
import type { AssetStatus } from '@/types/assets';
import { cn } from '@/lib/utils';

interface AssetStatusBadgeProps {
  status: AssetStatus | string;
  className?: string;
}

const STATUS_STYLES: Record<string, string> = {
  available: 'bg-[#eaf0e6] text-[#4d663e] border-[#d9e5d4]',
  assigned: 'bg-[#e8edf2] text-[#42526e] border-[#d8e0ea]',
  maintenance: 'bg-[#f5ebd9] text-[#8a5b1e] border-[#ebdcc4]',
  retired: 'bg-[#eceae4] text-[#1c1c1c] border-[#dcd9d0]',
  lost: 'bg-[#fae8e8] text-[#991b1b] border-[#f2cfcf]',
};

export function AssetStatusBadge({ status, className }: AssetStatusBadgeProps) {
  const normalized = status.toLowerCase();
  const styleClass = STATUS_STYLES[normalized] ?? STATUS_STYLES.available;

  return (
    <Badge
      variant="outline"
      className={cn('font-medium text-xs px-2.5 py-0.5 rounded-full shadow-none', styleClass, className)}
    >
      {getAssetStatusLabel(normalized)}
    </Badge>
  );
}