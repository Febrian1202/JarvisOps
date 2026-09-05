'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { UserFilters } from '@/components/admin/UserFilters';
import { UsersTable } from '@/components/admin/UsersTable';
import { UserFormDialog } from '@/components/admin/UserFormDialog';
import { ResetPasswordDialog } from '@/components/admin/ResetPasswordDialog';
import { useUsers, useUserReferences, type UserQueryParams } from '@/hooks/use-users';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useAuth } from '@/components/providers/auth-provider';
import { apiFetch } from '@/lib/client/api';
import { userKeys } from '@/lib/query-keys';
import type { UserAdminDetail, UserListItem } from '@/types/auth';

export function UsersPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const { can, isLoading: isAuthLoading } = useAuth();

  const canView = can('user.viewAny');

  useEffect(() => {
    if (!isAuthLoading && !canView) {
      router.replace('/403');
    }
  }, [canView, isAuthLoading, router]);

  const page = Number(searchParams.get('page')) || 1;
  const perPage = Number(searchParams.get('per_page')) || 10;
  const search = searchParams.get('search') || '';
  const roleId = searchParams.get('role_id') || '';
  const departmentId = searchParams.get('department_id') || '';
  const status = searchParams.get('status') || '';
  const sortBy = searchParams.get('sort_by') || 'full_name';
  const sortDir = (searchParams.get('sort_dir') as 'asc' | 'desc') || 'asc';

  const { roles, departments } = useUserReferences();

  const queryParams: UserQueryParams = {
    page,
    per_page: perPage,
    search,
    role_id: roleId,
    department_id: departmentId,
    status,
    sort_by: sortBy,
    sort_dir: sortDir,
  };

  const { data: response, isLoading } = useUsers(queryParams, canView);
  const users = response?.data ?? [];
  const meta = response?.meta;

  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserListItem | null>(null);
  const [resetUser, setResetUser] = useState<UserListItem | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserListItem | null>(null);
  const [toggleUser, setToggleUser] = useState<UserListItem | null>(null);

  const deleteMutation = useApiMutation<number, unknown>({
    mutationFn: (id) => apiFetch(`/users/${id}`, { method: 'DELETE' }),
    onSuccessMessage: 'Pengguna berhasil dihapus.',
    invalidateKeys: [userKeys.lists()],
    onSuccess: () => setDeleteUser(null),
  });

  const toggleMutation = useApiMutation<
    { user: UserListItem; action: 'activate' | 'deactivate' },
    UserAdminDetail
  >({
    mutationFn: ({ user: target, action }) =>
      apiFetch<UserAdminDetail>(`/users/${target.id}/${action}`, {
        method: 'POST',
      }),
    onSuccessMessage: (data) =>
      data.data?.status === 'active'
        ? 'Pengguna berhasil diaktifkan.'
        : 'Pengguna berhasil dinonaktifkan.',
    invalidateKeys: [userKeys.lists()],
    onSuccess: () => setToggleUser(null),
  });

  function updateQueryParams(updates: Record<string, string | number | null>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === undefined || val === '') {
        params.delete(key);
      } else {
        params.set(key, String(val));
      }
    });
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      updateQueryParams({
        sort_dir: sortDir === 'asc' ? 'desc' : 'asc',
        page: 1,
      });
    } else {
      updateQueryParams({ sort_by: field, sort_dir: 'asc', page: 1 });
    }
  };

  const isToggleActive = toggleUser?.status === 'active';

  if (!canView) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-bold text-xl text-foreground tracking-tight">Pengguna</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">
            Kelola akun pengguna, peran, status aktif, dan reset password.
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 self-start sm:self-auto"
          onClick={() => {
            setEditingUser(null);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Pengguna</span>
        </Button>
      </div>

      <UserFilters />

      <UsersTable
        items={users}
        meta={meta}
        isLoading={isLoading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        onPageChange={(p) => updateQueryParams({ page: p })}
        onPerPageChange={(pp) => updateQueryParams({ per_page: pp, page: 1 })}
        onEdit={(user) => {
          setEditingUser(user);
          setFormOpen(true);
        }}
        onResetPassword={(user) => setResetUser(user)}
        onDelete={(user) => setDeleteUser(user)}
        onToggleStatus={(user) => setToggleUser(user)}
      />

      <UserFormDialog
        open={formOpen}
        user={editingUser}
        roles={roles}
        departments={departments}
        onClose={() => {
          setFormOpen(false);
          setEditingUser(null);
        }}
      />

      <ResetPasswordDialog
        open={resetUser !== null}
        user={resetUser}
        onClose={() => setResetUser(null)}
      />

      <ConfirmDialog
        open={deleteUser !== null}
        onOpenChange={(o) => !o && setDeleteUser(null)}
        title="Hapus Pengguna"
        description={`Apakah Anda yakin ingin menghapus akun "${deleteUser?.full_name}"? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Hapus"
        variant="destructive"
        isLoading={deleteMutation.isPending}
        onConfirm={() => deleteUser && deleteMutation.mutate(deleteUser.id)}
      />

      <ConfirmDialog
        open={toggleUser !== null}
        onOpenChange={(o) => !o && setToggleUser(null)}
        title={isToggleActive ? 'Nonaktifkan Pengguna' : 'Aktifkan Pengguna'}
        description={
          isToggleActive
            ? `Nonaktifkan akun "${toggleUser?.full_name}"? Pengguna tidak akan dapat login sampai akun diaktifkan kembali.`
            : `Aktifkan kembali akun "${toggleUser?.full_name}"? Pengguna akan dapat login seperti biasa.`
        }
        confirmText={isToggleActive ? 'Nonaktifkan' : 'Aktifkan'}
        variant={isToggleActive ? 'destructive' : 'default'}
        isLoading={toggleMutation.isPending}
        onConfirm={() =>
          toggleUser &&
          toggleMutation.mutate({
            user: toggleUser,
            action: isToggleActive ? 'deactivate' : 'activate',
          })
        }
      />
    </div>
  );
}
