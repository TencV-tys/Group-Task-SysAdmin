// hooks/useDataCache.ts
import { useState, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Use unknown instead of any, then cast when needed
const globalCache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_CACHE_TIME = 30 * 1000; // 30 seconds

export function useDataCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cacheTime: number = DEFAULT_CACHE_TIME
) {
  const [data, setData] = useState<T | null>(() => {
    const cached = globalCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      return cached.data as T; // Cast to T since we know it's the right type
    }
    return null;
  });
  
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Promise<T> | null>(null);

  const fetchData = useCallback(async (force = false) => {
    // Check cache first
    const now = Date.now();
    const cached = globalCache.get(key);
    
    if (!force && cached && (now - cached.timestamp) < cacheTime) {
      setData(cached.data as T);
      setLoading(false);
      return cached.data as T;
    }

    // Prevent multiple simultaneous requests
    if (pendingRef.current) {
      return pendingRef.current;
    }

    setLoading(true);
    const promise = (async () => {
      try {
        const result = await fetchFn();
        
        // Update cache
        globalCache.set(key, {
          data: result,
          timestamp: Date.now()
        });
        
        setData(result);
        setError(null);
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Fetch failed';
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
        pendingRef.current = null;
      }
    })();

    pendingRef.current = promise;
    return promise;
  }, [key, fetchFn, cacheTime]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);
  
  const clearCache = useCallback(() => {
    globalCache.delete(key);
    setData(null);
  }, [key]);

  return {
    data,
    loading,
    error,
    fetchData,
    refresh,
    clearCache
  };
}