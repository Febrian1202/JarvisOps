'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, UserCheck, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { apiFetch } from '@/lib/client/api';
import { userKeys } from '@/lib/query-keys';
import { useDebounce } from '@/hooks/use-debounce';
import type { AssetDetail } from '@/types/assets';
import type { AssignableUser } from '@/types/auth';

interface AssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetail;
  isSubmitting: boolean;
  onSubmit: (data: { user_id: number; notes?: string }) => void;
}

export function AssignDialog({ open, onOpenChange, asset, isSubmitting, onSubmit }: AssignDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<AssignableUser | null>(null);
  const [notes, setNotes] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const debouncedSearch = useDebounce(search, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const { data: usersResponse, isLoading } = useQuery({
    queryKey: userKeys.assignable(debouncedSearch || undefined),
    queryFn: () => {
      const endpoint = debouncedSearch
        ? `/users/assignable?search=${encodeURIComponent(debouncedSearch)}`
        : '/users/assignable';
      return apiFetch<AssignableUser[]>(endpoint);
    },
    enabled: open,
  });
  const users = usersResponse?.data ?? [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setSelectedUser(null);
      setNotes('');
      setSearch('');
      setIsDropdownOpen(false);
    }
    onOpenChange(isOpen);
  };

  const handleSelectUser = (user: AssignableUser) => {
    setSelectedUser(user);
    setSearch('');
    setIsDropdownOpen(false);
  };

  const handleClearSelectedUser = () => {
    setSelectedUser(null);
    setSearch('');
    setIsDropdownOpen(true);
  };

  const handleSubmit = () => {
    if (selectedUser) {
      onSubmit({ user_id: selectedUser.id, notes: notes.trim() || undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tugaskan Aset</DialogTitle>
          <DialogDescription>
            Pilih pengguna yang akan menerima aset <strong>{asset.asset_tag}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* User selection field */}
          <div className="space-y-1.5" ref={searchContainerRef}>
            <Label htmlFor="user-search">Pengguna Penerima</Label>

            {selectedUser ? (
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-2.5 transition-colors">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {selectedUser.full_name}
                    </p>
                    {selectedUser.department && (
                      <p className="truncate text-xs text-muted-foreground">
                        {selectedUser.department.name}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSelectedUser}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Ganti pengguna</span>
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="user-search"
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      if (!isDropdownOpen) setIsDropdownOpen(true);
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Cari nama pengguna…"
                    className="pl-9 text-sm"
                    autoComplete="off"
                  />
                  {isLoading && (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  )}
                </div>

                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1.5 origin-top overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-md animate-popover-in motion-reduce:animate-none">
                    <ScrollArea className="max-h-52">
                      <div className="p-1 space-y-0.5">
                        {users.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => handleSelectUser(u)}
                            className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                          >
                            <div className="min-w-0">
                              <span className="block font-medium truncate">{u.full_name}</span>
                              {u.department && (
                                <span className="block text-xs text-muted-foreground truncate">
                                  {u.department.name}
                                </span>
                              )}
                            </div>
                            <UserCheck className="h-4 w-4 shrink-0 text-muted-foreground opacity-50" />
                          </button>
                        ))}
                        {users.length === 0 && (
                          <p className="text-xs text-muted-foreground py-4 text-center">
                            {isLoading
                              ? 'Memuat pengguna…'
                              : search
                              ? 'Tidak ada pengguna yang cocok.'
                              : 'Ketik nama untuk mencari…'}
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="assign-notes">Catatan tugas (opsional)</Label>
            <Textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan penugasan…"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Batal
          </Button>
          <Button disabled={!selectedUser || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Menugaskan…' : 'Tugaskan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}