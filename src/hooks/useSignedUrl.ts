import { useCallback, useEffect, useRef, useState } from 'react';
import { getSignedUrl, invalidateSignedUrl } from '../services/storage';

interface SignedUrlState {
  url: string | null;
  loading: boolean;
  failed: boolean;
  /** Regenera la URL (útil si el navegador reporta un error de carga por expiración). */
  refresh: () => void;
}

/** Resuelve una ruta del bucket privado a una URL firmada y la renueva antes de que expire. */
export function useSignedUrl(path: string | null | undefined): SignedUrlState {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const refreshAttempts = useRef(0);

  useEffect(() => {
    refreshAttempts.current = 0;
    if (!path) {
      setUrl(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    let cancelled = false;
    let timer: number | undefined;
    setLoading(true);
    setFailed(false);
    getSignedUrl(path)
      .then((signed) => {
        if (cancelled) return;
        setUrl(signed);
        // Renovar a los 50 minutos (la URL dura 60).
        timer = window.setTimeout(() => {
          invalidateSignedUrl(path);
          setTick((t) => t + 1);
        }, 50 * 60 * 1000);
      })
      .catch(() => {
        if (!cancelled) {
          setUrl(null);
          setFailed(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [path, tick]);

  const refresh = useCallback(() => {
    if (!path) return;
    if (refreshAttempts.current >= 1) {
      setUrl(null);
      setFailed(true);
      return;
    }
    refreshAttempts.current += 1;
    invalidateSignedUrl(path);
    setTick((t) => t + 1);
  }, [path]);

  return { url, loading, failed, refresh };
}
