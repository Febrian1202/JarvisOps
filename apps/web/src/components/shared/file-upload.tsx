'use client';

import React, { useRef, useState, useCallback } from 'react';
import { UploadCloud, File, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  isUploading?: boolean;
  uploadProgress?: number;
  capture?: boolean | 'user' | 'environment';
}

export function FileUpload({
  file,
  onFileSelect,
  className,
  disabled = false,
  isUploading = false,
  uploadProgress = 0,
  capture,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndProcessFile = useCallback(
    (selected: File | null): boolean => {
      setError(null);
      if (!selected) return false;

      // Validate mime
      if (!ALLOWED_MIME_TYPES.includes(selected.type)) {
        setError('Format berkas harus JPG, PNG, atau PDF.');
        return false;
      }

      // Validate size
      if (selected.size > MAX_FILE_SIZE_BYTES) {
        setError('Ukuran berkas melebihi batas maksimal 5 MB.');
        return false;
      }

      onFileSelect(selected);
      return true;
    },
    [onFileSelect]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    validateAndProcessFile(selected);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled || isUploading) return;
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled || isUploading) return;

    const droppedFile = e.dataTransfer.files?.[0] ?? null;
    validateAndProcessFile(droppedFile);
  };

  const handleClear = () => {
    if (isUploading) return;
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
        accept=".jpg,.jpeg,.png,.pdf,image/*"
        capture={capture ? (typeof capture === 'string' ? capture : 'environment') : undefined}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
        id="file-upload-input"
      />

      {!file ? (
        <label
          htmlFor="file-upload-input"
          data-testid="file-dropzone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer text-center',
            isDragActive && 'border-primary bg-primary/5 ring-2 ring-primary/20',
            (disabled || isUploading) && 'opacity-50 cursor-not-allowed pointer-events-none'
          )}
        >
          <UploadCloud
            className={cn(
              'h-8 w-8 text-muted-foreground mb-2 transition-colors',
              isDragActive && 'text-primary'
            )}
          />
          <p className="text-xs font-medium text-foreground">
            {isDragActive
              ? 'Lepaskan berkas di sini'
              : 'Klik untuk memilih berkas lampiran atau tarik & lepas ke sini'}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Maksimal 5 MB (JPG, PNG, PDF)
          </p>
        </label>
      ) : (
        <div className="space-y-2.5 p-3 border border-border rounded-lg bg-card">
          <div className="flex items-center justify-between">
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
              disabled={isUploading}
              className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive disabled:opacity-40"
              aria-label="Hapus berkas"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {isUploading && (
            <div className="space-y-1.5 pt-1 border-t border-border">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground font-medium">
                  Mengunggah… {uploadProgress}%
                </span>
                <span className="font-mono text-muted-foreground">
                  {uploadProgress}%
                </span>
              </div>
              <Progress value={uploadProgress} aria-label="Progres unggah berkas" />
            </div>
          )}
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
