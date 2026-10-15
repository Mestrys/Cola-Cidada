import { useCallback, useEffect, useState } from 'react';

export interface AsyncState<T> {
  data?: T;
  error?: Error;
  loading: boolean;
  reload: () => void;
}

/**
 * Carrega algo assíncrono ao montar e quando `deps` mudam (devem ser valores simples). Respostas de pedidos
 * antigos são descartadas; enquanto o novo pedido não chega, `data` mantém o resultado anterior.
 */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]): AsyncState<T> {
  const [tick, setTick] = useState(0);
  const [result, setResult] = useState<{ key: string; data?: T; error?: Error }>({ key: '' });
  const key = JSON.stringify([...deps, tick]);

  useEffect(() => {
    let alive = true;
    fn().then(
      (data) => alive && setResult({ key, data }),
      (error) => alive && setResult({ key, error: error as Error })
    );
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = result.key !== key;
  return { data: result.data, error: loading ? undefined : result.error, loading, reload };
}
