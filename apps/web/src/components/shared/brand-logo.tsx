import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export interface BrandLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  showSubtitle?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: {
    iconSize: 28,
    containerClass: 'h-7 w-7 rounded-lg',
    titleClass: 'text-sm',
    subtitleClass: 'text-[8px] tracking-[0.14em]',
  },
  md: {
    iconSize: 32,
    containerClass: 'h-8 w-8 rounded-lg',
    titleClass: 'text-[15px]',
    subtitleClass: 'text-[9px] tracking-[0.16em]',
  },
  lg: {
    iconSize: 40,
    containerClass: 'h-10 w-10 rounded-xl',
    titleClass: 'text-lg',
    subtitleClass: 'text-[10px] tracking-[0.18em]',
  },
};

export function BrandLogo({
  size = 'sm',
  showText = true,
  showSubtitle = true,
  className,
}: BrandLogoProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {/* Robot Mascot Icon */}
      <div
        className={cn(
          'relative shrink-0 overflow-hidden bg-[#F7F4ED] dark:bg-[#201F1E] border border-border/60 shadow-xs flex items-center justify-center p-0.5',
          config.containerClass
        )}
      >
        <Image
          src="/brand/logo.png"
          alt="JARVIS OPS Logo"
          width={config.iconSize}
          height={config.iconSize}
          className="h-full w-full object-contain"
          priority
        />
      </div>

      {/* Typography Lockup */}
      {showText && (
        <div className="flex flex-col text-left leading-none">
          <span className={cn('font-bold tracking-tight text-foreground leading-tight', config.titleClass)}>
            <span className="sr-only">JARVIS OPS</span>
            <span aria-hidden="true">
              JARVIS <span className="text-[#B89C72] dark:text-[#D4B98E]">OPS</span>
            </span>
          </span>
          {showSubtitle && (
            <span
              className={cn(
                'font-semibold uppercase text-muted-foreground mt-0.5',
                config.subtitleClass
              )}
            >
              IT Service Management
            </span>
          )}
        </div>
      )}
    </div>
  );
}
