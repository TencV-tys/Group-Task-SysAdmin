// hooks/useAdminAudit.ts
import { useState, useCallback } from 'react';
import { AdminAuditService } from '../services/admin.audit.service';
import type { 
  AuditLog, 
  AuditStatisticsResponse, 
  AuditLogFilters,
  AuditLogsResponse,
 
} from '../services/admin.audit.service';

// Define specific types instead of any
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

interface FetchLogsResult {
  success: boolean;
  data?: AuditLogsResponse;
  message?: string;
}
 
interface FetchStatisticsResult {
  success: boolean;
  data?: AuditStatisticsResponse['statistics'];
  message?: string;
}

interface FetchLogByIdResult {
  success: boolean;
  log?: AuditLog;
  message?: string;
}

interface UseAdminAuditReturn {
  logs: AuditLog[];
  loading: boolean;
  error: string | null;
  stats: AuditStatisticsResponse['statistics'] | null;
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
  fetchLogs: (params?: FetchLogsParams) => Promise<FetchLogsResult>;
  fetchStatistics: (params?: StatisticsParams) => Promise<FetchStatisticsResult>;
  getLogById: (id: string) => Promise<FetchLogByIdResult>;
  refresh: () => Promise<void>;
  setPagination: React.Dispatch<React.SetStateAction<{
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  }>>;
}

export function useAdminAudit(initialLimit: number = 20): UseAdminAuditReturn {
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    pages: 1,
    hasMore: false,
  });
  
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStatisticsResponse['statistics'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = useCallback(async (params?: FetchLogsParams): Promise<FetchLogsResult> => {
    setLoading(true);
    setError(null);
    try {
      const result = await AdminAuditService.getLogs(params);
      if (result.success) {
        setLogs(result.logs || []);
        setPagination(prev => ({
          ...prev,
          total: result.pagination?.total || 0,
          hasMore: result.pagination?.hasMore || false,
          pages: Math.ceil((result.pagination?.total || 0) / prev.limit),
        }));
        return { success: true, data: result };
      } else {
        setError(result.message || 'Failed to load logs');
        return { success: false, message: result.message };
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStatistics = useCallback(async (params?: StatisticsParams): Promise<FetchStatisticsResult> => {
    try {
      const result = await AdminAuditService.getStatistics(params);
      if (result.success) {
        setStats(result.statistics || null);
        return { success: true, data: result.statistics };
      }
      return { success: false, message: result.message };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch statistics';
      return { success: false, message: errorMessage };
    }
  }, []);

  const getLogById = useCallback(async (id: string): Promise<FetchLogByIdResult> => {
    setLoading(true);
    try {
      const result = await AdminAuditService.getLogById(id);
      if (result.success && result.log) {
        return { success: true, log: result.log };
      }
      return { success: false, message: result.message };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch log';
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    // Re-fetch with current pagination
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
    refresh,
    setPagination,
  };
}