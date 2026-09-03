'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
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
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const { data: usersResponse } = useQuery({
    queryKey: userKeys.assignable(debouncedSearch || undefined),
    queryFn: () => {
      const endpoint = debouncedSearch
        ? `/users/assignable?search=${encodeURIComponent(debouncedSearch)}`
        : '/users/assignable';
      return apiFetch<AssignableUser[]>(endpoint);
    },
  });
  const users = usersResponse?.data ?? [];

  const handleSubmit = () => {
    if (selectedUserId) {
      onSubmit({ user_id: selectedUserId, notes: notes || undefined });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setSelectedUserId(null); setNotes(''); setSearch(''); } else { onOpenChange(o); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Tugaskan Aset</DialogTitle>
          <DialogDescription>
            Pilih pengguna yang akan menerima aset <strong>{asset.asset_tag}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama pengguna…"
              className="pl-9 text-sm"
            />
          </div>

          <ScrollArea className="max-h-48">
            <div className="space-y-1">
              {users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setSelectedUserId(u.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                    selectedUserId === u.id
                      ? 'bg-primary text-primary-foreground font-medium'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <span className="block">{u.full_name}</span>
                  {u.department && (
                    <span className={`block text-xs ${selectedUserId === u.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {u.department.name}
                    </span>
                  )}
                </button>
              ))}
              {users.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  {search ? 'Tidak ada pengguna yang cocok.' : 'Ketik nama untuk mencari…'}
                </p>
              )}
            </div>
          </ScrollArea>

          <div className="space-y-1.5">
            <Label htmlFor="assign-notes">Catatan tugas (opsional)</Label>
            <Textarea
              id="assign-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tambahkan catatan penugasan…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button disabled={!selectedUserId || isSubmitting} onClick={handleSubmit}>
            {isSubmitting ? 'Menugaskan…' : 'Tugaskan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}