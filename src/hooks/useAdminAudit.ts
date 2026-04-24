// hooks/useAdminAudit.ts - COMPLETE FIXED VERSION (no infinite loop)

import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminAuditService } from '../services/admin.audit.service';
import type { 
  AuditLog, 
  AuditStatisticsResponse, 
  AuditLogFilters,
} from '../services/admin.audit.service';

interface FetchLogsParams extends AuditLogFilters {
  limit: number;
  offset: number;
  search?: string;
  adminId?: string;
  action?: string; 
  startDate?: string; 
  endDate?: string;
}

interface StatisticsParams {
  startDate?: string;
  endDate?: string;
}

export function useAdminAudit(initialLimit: number = 20) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<AuditStatisticsResponse['statistics'] | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    pages: 1,
    hasMore: false,
  });

  const isMountedRef = useRef(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const initialLoadDoneRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ✅ FIX: Remove setPagination from inside fetchLogs to prevent infinite loop
  const fetchLogs = useCallback(async (params?: FetchLogsParams) => {
    if (!isMountedRef.current) return { success: false, message: 'Unmounted' };
    
    setLoading(true);
    setError(null);
    try {
      const result = await AdminAuditService.getLogs(params);
      console.log('🔍 [useAdminAudit] Raw API response:', result);
console.log('🔍 [useAdminAudit] Logs array length:', result.logs?.length);
      if (isMountedRef.current && result.success) {
        setLogs(result.logs || []);
        // ✅ Update pagination without causing re-fetch
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          hasMore: result.pagination?.hasMore || false,
          pages: Math.ceil((result.pagination?.total || 0) / prev.limit),
        }));
        return { success: true, data: result };
      } else if (isMountedRef.current) {
        setError(result.message || 'Failed to load logs');
        return { success: false, message: result.message };
      }
      return { success: false, message: 'Unmounted' };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      if (isMountedRef.current) setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async (params?: StatisticsParams) => {
    if (!isMountedRef.current) return { success: false, message: 'Unmounted' };
    
    try {
      const result = await AdminAuditService.getStatistics(params);
      if (isMountedRef.current && result.success) {
        setStats(result.statistics || null);
        return { success: true, data: result.statistics };
      }
      return { success: false, message: result.message };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch statistics';
      return { success: false, message: errorMessage };
    }
  }, []);

  const getLogById = useCallback(async (id: string) => {
    if (!isMountedRef.current) return { success: false, message: 'Unmounted' };
    
    try {
      const result = await AdminAuditService.getLogById(id);
      if (result.success && result.log) {
        return { success: true, log: result.log };
      }
      return { success: false, message: result.message };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch log';
      return { success: false, message: errorMessage };
    }
  }, []);

  const deleteLog = useCallback(async (logId: string) => {
    try {
      const result = await AdminAuditService.deleteLog(logId);
      if (result.success && isMountedRef.current) {
        setLogs(prev => prev.filter(log => log.id !== logId));
        setPagination(prev => ({
          ...prev,
          total: Math.max(0, prev.total - 1)
        }));
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete log';
      return { success: false, message: errorMessage };
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    const params: FetchLogsParams = {
      limit: pagination.limit,
      offset: (pagination.page - 1) * pagination.limit
    };
    await fetchLogs(params);
    await fetchStatistics();
  }, [pagination.page, pagination.limit, fetchLogs, fetchStatistics]);

  return {
    logs,
    loading,
    error,
    stats,
    pagination,
    fetchLogs,
    fetchStatistics,
    getLogById,
    deleteLog, 
    refresh,
    setPagination,
  };
}