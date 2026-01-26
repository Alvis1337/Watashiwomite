import { useState, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  showToast?: boolean;
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (url: string, options: RequestInit & UseApiOptions = {}) => {
    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const {
      onSuccess,
      onError,
      successMessage,
      errorMessage,
      showToast = true,
      ...fetchOptions
    } = options;

    setLoading(true);
    let toastId: string | undefined;

    if (showToast && !successMessage && !errorMessage) {
      toastId = toast.loading('Loading...');
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      if (showToast && successMessage) {
        if (toastId) {
          toast.success(successMessage, { id: toastId });
        } else {
          toast.success(successMessage);
        }
      } else if (toastId) {
        toast.dismiss(toastId);
      }

      onSuccess?.(data);
      return { data, error: null };
    } catch (error) {
      // Don't show error for aborted requests
      if (error instanceof Error && error.name === 'AbortError') {
        return { data: null, error };
      }

      const err = error instanceof Error ? error : new Error('Unknown error');

      if (showToast) {
        const message = errorMessage || err.message;
        if (toastId) {
          toast.error(message, { id: toastId });
        } else {
          toast.error(message);
        }
      }

      onError?.(err);
      return { data: null, error: err };
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  return { execute, loading };
}
