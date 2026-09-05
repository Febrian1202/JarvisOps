import React from 'react';
import { screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders } from '@/test/test-utils';
import { FileUpload } from '@/components/shared/file-upload';

describe('FileUpload Component', () => {
  it('renders idle dropzone with upload prompt', () => {
    renderWithProviders(<FileUpload file={null} onFileSelect={vi.fn()} />);

    expect(screen.getByText(/klik untuk memilih berkas lampiran/i)).toBeInTheDocument();
    expect(screen.getByText(/maksimal 5 mb/i)).toBeInTheDocument();
  });

  it('selects valid file via input change', () => {
    const onFileSelect = vi.fn();
    renderWithProviders(<FileUpload file={null} onFileSelect={onFileSelect} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'test.png', { type: 'image/png' });
    fireEvent.change(input, { target: { files: [file] } });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('accepts valid file via drag and drop', () => {
    const onFileSelect = vi.fn();
    renderWithProviders(<FileUpload file={null} onFileSelect={onFileSelect} />);

    const dropzone = screen.getByTestId('file-dropzone');
    const file = new File(['pdf-data'], 'document.pdf', { type: 'application/pdf' });

    fireEvent.dragOver(dropzone);
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(onFileSelect).toHaveBeenCalledWith(file);
  });

  it('rejects invalid mime type dropped onto dropzone', () => {
    const onFileSelect = vi.fn();
    renderWithProviders(<FileUpload file={null} onFileSelect={onFileSelect} />);

    const dropzone = screen.getByTestId('file-dropzone');
    const invalidFile = new File(['exe-data'], 'app.exe', { type: 'application/x-msdownload' });

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [invalidFile] },
    });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/format berkas harus jpg, png, atau pdf/i)).toBeInTheDocument();
  });

  it('rejects file larger than 5MB dropped onto dropzone', () => {
    const onFileSelect = vi.fn();
    renderWithProviders(<FileUpload file={null} onFileSelect={onFileSelect} />);

    const dropzone = screen.getByTestId('file-dropzone');
    const largeFile = new File(['x'.repeat(100)], 'huge.png', { type: 'image/png' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    fireEvent.drop(dropzone, {
      dataTransfer: { files: [largeFile] },
    });

    expect(onFileSelect).not.toHaveBeenCalled();
    expect(screen.getByText(/ukuran berkas melebihi batas maksimal 5 mb/i)).toBeInTheDocument();
  });

  it('renders selected file and allows clearing it', () => {
    const onFileSelect = vi.fn();
    const file = new File(['hello'], 'screenshot.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 1024 * 1024 });

    renderWithProviders(<FileUpload file={file} onFileSelect={onFileSelect} />);

    expect(screen.getByText('screenshot.png')).toBeInTheDocument();
    expect(screen.getByText('1.00 MB')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /hapus berkas/i });
    fireEvent.click(clearBtn);

    expect(onFileSelect).toHaveBeenCalledWith(null);
  });

  it('renders upload progress bar when isUploading is true', () => {
    const file = new File(['data'], 'report.pdf', { type: 'application/pdf' });
    renderWithProviders(
      <FileUpload
        file={file}
        onFileSelect={vi.fn()}
        isUploading={true}
        uploadProgress={45}
      />
    );

    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    expect(screen.getByText(/mengunggah… 45%/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toBeInTheDocument();

    // Clear button should be disabled or hidden during upload
    expect(screen.queryByRole('button', { name: /hapus berkas/i })).toBeDisabled();
  });

  it('supports capture attribute for camera support', () => {
    renderWithProviders(
      <FileUpload file={null} onFileSelect={vi.fn()} capture="environment" />
    );
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.getAttribute('capture')).toBe('environment');
  });
});
