import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, type ApiOptions } from "@/lib/api";

export function useApi<T = any>(
  path: string | null,
  options: ApiOptions = {},
  deps: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(!!path);
  const [error, setError] = useState<string | null>(null);
  const optsRef = useRef(options);
  optsRef.current = options;

  const fetcher = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<T>(path, optsRef.current);
      setData(res);
    } catch (e: any) {
      setError(e?.message || "Request failed");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    fetcher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);

  return { data, loading, error, refetch: fetcher, setData };
}
