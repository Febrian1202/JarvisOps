'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import type { AssetDetail } from '@/types/assets';

interface ReleaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  asset: AssetDetail;
  isSubmitting: boolean;
  onSubmit: (data: { notes?: string }) => void;
}

export function ReleaseDialog({ open, onOpenChange, asset, isSubmitting, onSubmit }: ReleaseDialogProps) {
  const [notes, setNotes] = useState('');

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) {
          setNotes('');
          onOpenChange(o);
        } else {
          onOpenChange(o);
        }
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Lepaskan Penugasan Aset</DialogTitle>
          <DialogDescription>
            Anda akan melepas aset <strong>{asset.asset_tag}</strong> dari{' '}
            <strong>{asset.current_assignment?.full_name ?? 'pemegang saat ini'}</strong>.
            Tindakan ini tidak dapat diurungkan.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="release-notes">Catatan pelepasan (opsional)</Label>
          <Textarea
            id="release-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Alasan atau keterangan pelepasan…"
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button
            variant="destructive"
            disabled={isSubmitting}
            onClick={() => onSubmit({ notes: notes || undefined })}
          >
            {isSubmitting ? 'Melepas…' : 'Lepaskan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}