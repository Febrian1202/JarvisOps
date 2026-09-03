'use client';

import React from 'react';
import Link from 'next/link';
import { User, LogOut, Shield } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/components/providers/auth-provider';
import { getRoleLabel } from '@/lib/labels';

export function NavUser() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  const initials = user.full_name
    ? user.full_name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const roleName = user.role?.name ?? 'employee';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Menu profil pengguna"
          className="flex items-center gap-2 rounded-full p-1 text-left outline-none ring-offset-background transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Avatar className="h-8 w-8 border border-border">
            <AvatarFallback className="bg-primary/10 font-medium text-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="font-medium text-foreground text-sm leading-none">
              {user.full_name}
            </p>
            <p className="text-muted-foreground text-xs leading-none">
              {user.email}
            </p>
            <div className="pt-1.5">
              <Badge variant="secondary" className="text-[10px] font-medium uppercase">
                <Shield className="mr-1 h-3 w-3" />
                {getRoleLabel(roleName)}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>Profil Saya</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void logout()}
          className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Keluar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
