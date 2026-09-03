'use client';

import React, { createContext, useContext, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'next/navigation';
import { apiFetch } from '@/lib/client/api';
import { authKeys } from '@/lib/query-keys';
import type { AuthUser, RoleName } from '@/types/auth';

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  can: (ability: string) => boolean;
  hasRole: (role: RoleName | string) => boolean;
  logout: () => Promise<void>;
  refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const {
    data: response,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: authKeys.me(),
    queryFn: () => apiFetch<AuthUser>('/me'),
    retry: false,
  });

  const user = response?.data ?? null;

  useEffect(() => {
    if (user?.must_change_password && pathname !== '/ganti-password') {
      router.push('/ganti-password');
    }
  }, [user, pathname, router]);

  const can = (ability: string): boolean => {
    if (!user) {
      return false;
    }
    return user.permissions?.includes(ability) ?? false;
  };

  const hasRole = (role: RoleName | string): boolean => {
    if (!user?.role) {
      return false;
    }
    return user.role.name === role;
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } finally {
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        can,
        hasRole,
        logout,
        refetchUser: () => {
          void refetch();
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
