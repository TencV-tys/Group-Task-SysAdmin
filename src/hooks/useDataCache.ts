// hooks/useDataCache.ts
import { useState, useCallback, useRef, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const globalCache = new Map<string, CacheEntry<unknown>>();

const DEFAULT_CACHE_TIME = 30 * 1000; // 30 seconds

export function useDataCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  cacheTime: number = DEFAULT_CACHE_TIME
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Promise<T> | null>(null);
  const mountedRef = useRef(true);
  const initialFetchDone = useRef(false);

  // Initialize from cache
  useEffect(() => {
    const cached = globalCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTime) {
      setData(cached.data as T);
      setLoading(false);
      initialFetchDone.current = true;
    }
  }, [key, cacheTime]);

  const fetchData = useCallback(async (force = false) => {
    // Check cache first (if not forced)
    const now = Date.now();
    const cached = globalCache.get(key);
    
    if (!force && cached && (now - cached.timestamp) < cacheTime) {
      if (mountedRef.current) {
        setData(cached.data as T);
        setLoading(false);
        setError(null);
      }
      return cached.data as T;
    }

    // Prevent multiple simultaneous requests
    if (pendingRef.current) {
      return pendingRef.current;
    }

    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }
    
    const promise = (async () => {
      try {
        const result = await fetchFn();
        
        if (mountedRef.current) {
          // Update cache
          globalCache.set(key, {
            data: result,
            timestamp: Date.now()
          });
          
          setData(result);
          setError(null);
        }
        return result;
      } catch (err) {
        if (mountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Fetch failed';
          setError(errorMessage);
        }
        throw err;
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
        pendingRef.current = null;
      }
    })();

    pendingRef.current = promise;
    return promise;
  }, [key, fetchFn, cacheTime]);

  // Initial fetch if no cache and not already fetched
  useEffect(() => {
    if (!initialFetchDone.current && !data) {
      initialFetchDone.current = true;
      fetchData();
    }
  }, [data, fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);
  
  const clearCache = useCallback(() => {
    globalCache.delete(key);
    setData(null);
    setLoading(false);
    setError(null);
    initialFetchDone.current = false;
  }, [key]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    refresh,
    clearCache
  };
}