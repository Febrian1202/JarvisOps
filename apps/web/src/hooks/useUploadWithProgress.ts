'use client';

import { useState, useCallback, useRef } from 'react';
import type { ApiResponse } from '@/types/api';

export interface UseUploadWithProgressOptions<T = unknown> {
  url: string; // relative path, e.g. /api/proxy/tickets/5/attachments
  method?: 'POST' | 'PUT';
  onProgress?: (percent: number) => void;
  onSuccess?: (data: ApiResponse<T>) => void;
  onError?: (error: string) => void;
}

export function useUploadWithProgress<T = unknown>({
  url,
  method = 'POST',
  onProgress,
  onSuccess,
  onError,
}: UseUploadWithProgressOptions<T>) {
  const [progress, setProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  const abort = useCallback(() => {
    if (xhrRef.current) {
      xhrRef.current.abort();
      setIsUploading(false);
      setProgress(0);
    }
  }, []);

  const upload = useCallback(
    (formData: FormData): Promise<ApiResponse<T>> => {
      return new Promise((resolve, reject) => {
        setIsUploading(true);
        setProgress(0);
        setError(null);

        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        // Ensure URL starts with /api/proxy
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;
        const targetUrl = cleanUrl.startsWith('/api/proxy')
          ? cleanUrl
          : `/api/proxy${cleanUrl}`;

        xhr.open(method, targetUrl, true);
        xhr.setRequestHeader('Accept', 'application/json');

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
            onProgress?.(percent);
          }
        };

        xhr.onload = () => {
          setIsUploading(false);
          let responseData: ApiResponse<T> | null = null;
          try {
            responseData = JSON.parse(xhr.responseText) as ApiResponse<T>;
          } catch {
            responseData = null;
          }

          if (xhr.status >= 200 && xhr.status < 300 && responseData && responseData.success) {
            setProgress(100);
            onSuccess?.(responseData);
            resolve(responseData);
          } else {
            let errorMsg = 'Gagal mengunggah berkas.';
            if (xhr.status === 429) {
              errorMsg = 'Terlalu banyak permintaan unggah. Silakan coba beberapa saat lagi.';
            } else if (responseData && 'message' in responseData) {
              errorMsg = responseData.message || errorMsg;
            }
            setError(errorMsg);
            onError?.(errorMsg);
            reject(new Error(errorMsg));
          }
        };

        xhr.onerror = () => {
          setIsUploading(false);
          const errorMsg = 'Terjadi kesalahan jaringan saat mengunggah berkas.';
          setError(errorMsg);
          onError?.(errorMsg);
          reject(new Error(errorMsg));
        };

        xhr.onabort = () => {
          setIsUploading(false);
          const errorMsg = 'Pengunggahan berkas dibatalkan.';
          setError(errorMsg);
          reject(new Error(errorMsg));
        };

        xhr.send(formData);
      });
    },
    [url, method, onProgress, onSuccess, onError]
  );

  return {
    upload,
    abort,
    progress,
    isUploading,
    error,
  };
}
