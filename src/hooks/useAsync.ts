import { useState, useEffect, useCallback, useRef } from 'react';

export interface AsyncState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAsync<T>(fn: () => Promise<T>, initial: T, deps: unknown[] = []): AsyncState<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fn();
      if (mounted.current) setData(result);
    } catch (e: unknown) {
      if (mounted.current) setError(e instanceof Error ? e.message : 'Erro desconhecido');
    } finally {
      if (mounted.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    mounted.current = true;
    fetch();
    return () => { mounted.current = false; };
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
