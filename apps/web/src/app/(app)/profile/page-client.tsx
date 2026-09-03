'use client';

import React from 'react';
import { User, ShieldCheck } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ProfileForm } from '@/components/profile/ProfileForm';
import { ChangePasswordForm } from '@/components/profile/ChangePasswordForm';
import { useAuth } from '@/components/providers/auth-provider';
import type { AuthUser } from '@/types/auth';

interface ProfilePageClientProps {
  initialUser: AuthUser;
}

export function ProfilePageClient({ initialUser }: ProfilePageClientProps) {
  const { user: authUser } = useAuth();
  const currentUser = authUser ?? initialUser;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="font-bold text-xl text-foreground tracking-tight">
          Profil Pengguna
        </h1>
        <p className="text-muted-foreground text-xs sm:text-sm">
          Kelola informasi identitas akun Anda, nomor kontak, dan keamanan kata sandi.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Card 1: Profile Information */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <span>Informasi Akun & Kontak</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Nama lengkap dan nomor telepon dapat diperbarui secara mandiri.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm user={currentUser} />
          </CardContent>
        </Card>

        {/* Card 2: Security & Change Password */}
        <Card className="border-border bg-card shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Keamanan & Kata Sandi</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Ubah password secara berkala untuk menjaga keamanan akun Anda.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChangePasswordForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
