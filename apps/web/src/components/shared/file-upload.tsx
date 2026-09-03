'use client';

import React, { useRef, useState } from 'react';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/pdf',
];

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

interface FileUploadProps {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  className?: string;
  disabled?: boolean;
}

export function FileUpload({
  file,
  onFileSelect,
  className,
  disabled = false,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Validate mime
    if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
      setError('Format berkas harus JPG, PNG, atau PDF.');
      return;
    }

    // Validate size
    if (selected.size > MAX_FILE_SIZE_BYTES) {
      setError('Ukuran berkas melebihi batas maksimal 5 MB.');
      return;
    }

    onFileSelect(selected);
  };

  const handleClear = () => {
    setError(null);
    onFileSelect(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={inputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled}
        id="file-upload-input"
      />

      {!file ? (
        <label
          htmlFor="file-upload-input"
          className={cn(
            'flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-[var(--radius)] bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-center',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-xs font-medium text-foreground">
            Klik untuk memilih berkas lampiran
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Maksimal 5 MB (JPG, PNG, PDF)
          </p>
        </label>
      ) : (
        <div className="flex items-center justify-between p-3 border border-border rounded-[var(--radius)] bg-card">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <File className="h-5 w-5 text-primary shrink-0" />
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-foreground truncate max-w-xs">
                {file.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleClear}
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
            aria-label="Hapus berkas"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
