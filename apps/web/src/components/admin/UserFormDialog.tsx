'use client';

import React, { useEffect, useState } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { apiFetch } from '@/lib/client/api';
import { userKeys } from '@/lib/query-keys';
import { setFormErrors } from '@/lib/client/error-mapper';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useUserDetail } from '@/hooks/use-users';
import { createUserSchema, updateUserSchema } from '@/schemas/user';
import { userStatusLabels } from '@/lib/labels';
import type {
  DepartmentReference,
  RoleReference,
  UserAdminDetail,
  UserListItem,
} from '@/types/auth';

interface UserFormDialogProps {
  open: boolean;
  user?: UserListItem | UserAdminDetail | null;
  roles: RoleReference[];
  departments: DepartmentReference[];
  onClose: () => void;
}

interface UserFormValues {
  full_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  role_id: string;
  department_id: string;
  status: 'active' | 'inactive';
  profile: {
    employee_code: string;
    phone: string;
    position: string;
    hire_date: string;
  };
}

const emptyProfile = {
  employee_code: '',
  phone: '',
  position: '',
  hire_date: '',
};

const createDefaults: UserFormValues = {
  full_name: '',
  email: '',
  password: '',
  password_confirmation: '',
  role_id: '',
  department_id: '',
  status: 'active',
  profile: { ...emptyProfile },
};

export function UserFormDialog({
  open,
  user = null,
  roles,
  departments,
  onClose,
}: UserFormDialogProps) {
  const isEdit = Boolean(user);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: (zodResolver(
      isEdit ? updateUserSchema : createUserSchema
    ) as unknown) as Resolver<UserFormValues>,
    defaultValues: createDefaults,
  });

  const { data: detailResponse } = useUserDetail(
    isEdit && open ? user!.id : null
  );
  const detail = detailResponse?.data;

  const handleClose = () => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    if (isEdit && detail) {
      reset({
        full_name: detail.full_name,
        email: detail.email,
        password: '',
        password_confirmation: '',
        role_id: detail.role ? String(detail.role.id) : '',
        department_id: detail.department ? String(detail.department.id) : '',
        status: (detail.status === 'inactive' ? 'inactive' : 'active'),
        profile: {
          employee_code: detail.profile?.employee_code ?? '',
          phone: detail.profile?.phone ?? '',
          position: detail.profile?.position ?? '',
          hire_date: detail.profile?.hire_date ?? '',
        },
      });
    } else if (!isEdit) {
      reset({ ...createDefaults, profile: { ...emptyProfile } });
    }
  }, [open, isEdit, detail, reset]);

  const mutation = useApiMutation<
    { endpoint: string; method: 'POST' | 'PUT'; body: Record<string, unknown> },
    UserAdminDetail
  >({
    mutationFn: ({ endpoint, method, body }) =>
      apiFetch<UserAdminDetail>(endpoint, {
        method,
        body: JSON.stringify(body),
      }),
    onSuccessMessage: isEdit
      ? 'Pengguna berhasil diperbarui.'
      : 'Pengguna berhasil ditambahkan.',
    invalidateKeys: [userKeys.lists()],
    onFormError: (backendErrors) => {
      setFormErrors(backendErrors, setError);
    },
    onSuccess: () => handleClose(),
  });

  const onSubmit = handleSubmit((values) => {
    const profile = {
      employee_code: values.profile.employee_code || null,
      phone: values.profile.phone || null,
      position: values.profile.position || null,
      hire_date: values.profile.hire_date || null,
    };

    if (isEdit && user) {
      mutation.mutate({
        endpoint: `/users/${user.id}`,
        method: 'PUT',
        body: {
          full_name: values.full_name,
          email: values.email,
          role_id: values.role_id ? Number(values.role_id) : null,
          department_id: values.department_id
            ? Number(values.department_id)
            : null,
          profile,
        },
      });
      return;
    }

    mutation.mutate({
      endpoint: '/users',
      method: 'POST',
      body: {
        full_name: values.full_name,
        email: values.email,
        password: values.password,
        password_confirmation: values.password_confirmation,
        role_id: Number(values.role_id),
        department_id: values.department_id
          ? Number(values.department_id)
          : null,
        status: values.status,
        profile,
      },
    });
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-h-[92vh] sm:max-h-[85vh] w-[95vw] sm:max-w-lg p-4 sm:p-6 overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Perbarui informasi akun beserta profil karyawan.'
              : 'Tambahkan akun pengguna baru beserta peran dan profil karyawan.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">
              Nama Lengkap <span className="text-destructive">*</span>
            </Label>
            <Input
              id="full_name"
              placeholder="Contoh: Andi Kusuma"
              {...register('full_name')}
              aria-invalid={!!errors.full_name}
              className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
            />
            {errors.full_name && (
              <p className="text-xs text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="nama@perusahaan.co.id"
              {...register('email')}
              aria-invalid={!!errors.email}
              className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          {!isEdit && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="password">
                  Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 8 karakter"
                    {...register('password')}
                    aria-invalid={!!errors.password}
                    className="pr-12 h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={
                      showPassword
                        ? 'Sembunyikan password'
                        : 'Tampilkan password'
                    }
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-1 flex size-11 sm:size-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password_confirmation">
                  Konfirmasi Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative flex items-center">
                  <Input
                    id="password_confirmation"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Ulangi password"
                    {...register('password_confirmation')}
                    aria-invalid={!!errors.password_confirmation}
                    className="pr-12 h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
                  />
                  <button
                    type="button"
                    aria-label={
                      showConfirmPassword
                        ? 'Sembunyikan konfirmasi password'
                        : 'Tampilkan konfirmasi password'
                    }
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-1 flex size-11 sm:size-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    {showConfirmPassword ? (
                      <EyeOff aria-hidden="true" className="h-4 w-4" />
                    ) : (
                      <Eye aria-hidden="true" className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password_confirmation && (
                  <p className="text-xs text-destructive">
                    {errors.password_confirmation.message}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="role_id">
                Role <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="role_id"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="role_id"
                      aria-invalid={!!errors.role_id}
                      className="w-full h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
                    >
                      <SelectValue placeholder="Pilih role…" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={String(role.id)}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role_id && (
                <p className="text-xs text-destructive">{errors.role_id.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="department_id">Departemen</Label>
              <Controller
                control={control}
                name="department_id"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger id="department_id" className="w-full h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm">
                      <SelectValue placeholder="Pilih departemen…" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((department) => (
                        <SelectItem
                          key={department.id}
                          value={String(department.id)}
                        >
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="status">
                Status User <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="status" className="w-full h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm">
                      <SelectValue placeholder="Pilih status…" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(userStatusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.status && (
                <p className="text-xs text-destructive">{errors.status.message}</p>
              )}
            </div>
          )}

          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-4">
            <p className="text-xs font-semibold text-foreground">
              Profil Karyawan (opsional)
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="profile.employee_code">Kode Karyawan</Label>
                <Input
                  id="profile.employee_code"
                  placeholder="Contoh: EMP-0001"
                  {...register('profile.employee_code')}
                  aria-invalid={!!errors.profile?.employee_code}
                  className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
                />
                {errors.profile?.employee_code && (
                  <p className="text-xs text-destructive">
                    {errors.profile.employee_code.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile.phone">Nomor Telepon</Label>
                <Input
                  id="profile.phone"
                  placeholder="Contoh: 081234567890"
                  {...register('profile.phone')}
                  aria-invalid={!!errors.profile?.phone}
                  className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
                />
                {errors.profile?.phone && (
                  <p className="text-xs text-destructive">
                    {errors.profile.phone.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile.position">Jabatan</Label>
                <Input
                  id="profile.position"
                  placeholder="Contoh: Staf IT"
                  {...register('profile.position')}
                  aria-invalid={!!errors.profile?.position}
                  className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
                />
                {errors.profile?.position && (
                  <p className="text-xs text-destructive">
                    {errors.profile.position.message}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="profile.hire_date">Tanggal Bergabung</Label>
                <Input
                  id="profile.hire_date"
                  type="date"
                  {...register('profile.hire_date')}
                  aria-invalid={!!errors.profile?.hire_date}
                  className="h-11 sm:h-9 min-h-[44px] sm:min-h-0 text-sm"
                />
                {errors.profile?.hire_date && (
                  <p className="text-xs text-destructive">
                    {errors.profile.hire_date.message}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 sticky bottom-0 bg-card pt-2 pb-1 border-t border-border sm:static sm:border-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
              className="h-11 min-h-[44px] w-full sm:h-9 sm:min-h-0 sm:w-auto"
            >
              Batal
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="h-11 min-h-[44px] w-full sm:h-9 sm:min-h-0 sm:w-auto"
            >
              {mutation.isPending
                ? 'Menyimpan…'
                : isEdit
                  ? 'Simpan Perubahan'
                  : 'Tambah Pengguna'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
