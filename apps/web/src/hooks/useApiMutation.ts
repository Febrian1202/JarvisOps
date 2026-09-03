import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/client/api';
import { errorMessages } from '@/lib/labels';
import type { ApiResponse } from '@/types/api';

export interface UseApiMutationOptions<TData, TResult = unknown> {
  mutationFn: (data: TData) => Promise<ApiResponse<TResult>>;
  onSuccessMessage?: string | ((data: ApiResponse<TResult>) => string);
  invalidateKeys?: readonly (readonly unknown[])[];
  onFormError?: (errors: Record<string, string[]>) => void;
  onSuccess?: (data: ApiResponse<TResult>) => void;
  onError?: (error: Error) => void;
}

export function useApiMutation<TData, TResult = unknown>({
  mutationFn,
  onSuccessMessage,
  invalidateKeys,
  onFormError,
  onSuccess,
  onError,
}: UseApiMutationOptions<TData, TResult>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      if (onSuccessMessage) {
        const msg =
          typeof onSuccessMessage === 'function'
            ? onSuccessMessage(data)
            : onSuccessMessage;
        toast.success(msg);
      }

      if (invalidateKeys && invalidateKeys.length > 0) {
        invalidateKeys.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key as unknown[] });
        });
      }

      onSuccess?.(data);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiClientError) {
        const status = err.status;

        // 422: Validation error - delegate to form handler if available
        if (status === 422 && err.errors && onFormError) {
          onFormError(err.errors);
          toast.error('Mohon periksa kembali data yang dimasukkan.');
          onError?.(err);
          return;
        }

        // 409: Conflict - special handling for master data referential integrity vs concurrency
        if (status === 409) {
          // If the backend returned an Indonesian error message (e.g., from ReferentialIntegrityGuard), show it
          const isIndonesian = /[a-z]/i.test(err.message) && !err.message.includes('Resource has been modified');
          const message = isIndonesian && err.message !== 'Terjadi kesalahan pada sistem.'
            ? err.message
            : errorMessages[409] || 'Data sudah diubah oleh pihak lain. Silakan muat ulang.';
          toast.error(message);
          onError?.(err);
          return;
        }

        // 403, 404, 429, 500 mapped to Indonesian messages
        const defaultMsg = errorMessages[status] || err.message || 'Terjadi kesalahan pada sistem.';
        toast.error(defaultMsg);
        onError?.(err);
        return;
      }

      const fallbackMsg =
        err instanceof Error ? err.message : 'Terjadi kesalahan pada sistem.';
      toast.error(fallbackMsg);
      onError?.(err instanceof Error ? err : new Error(fallbackMsg));
    },
  });
}
