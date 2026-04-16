// hooks/useUsers.ts - UPDATED

import { useState, useCallback, useEffect } from 'react';
import { AdminUsersService } from '../services/admin.users.service';
import type { User, UserFilters, UserDetails, UserStats } from '../services/admin.users.service';

interface FetchUsersResult {
  success: boolean;
  data?: {
    users: User[];
    pagination: { 
      page: number; 
      limit: number;
      total: number; 
      pages: number;
    };
  };
  message?: string;
} 

interface FetchUserDetailsResult {
  success: boolean;
  data?: UserDetails;
  message?: string;
}

interface FetchStatsResult {
  success: boolean;
  data?: UserStats;
  message?: string;
}

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  stats: UserStats | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchUsers: (filters?: UserFilters) => Promise<FetchUsersResult>;
  fetchStats: () => Promise<FetchStatsResult>;
  getUserDetails: (id: string) => Promise<FetchUserDetailsResult>;
  refresh: () => Promise<void>;
  setPagination: React.Dispatch<React.SetStateAction<{
    page: number;
    limit: number;
    total: number;
    pages: number;
  }>>;
}

export function useUsers(initialLimit: number = 10): UseUsersReturn {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    pages: 1,
  });

  const fetchStats = useCallback(async (): Promise<FetchStatsResult> => {
    console.log('📊 [useUsers] fetchStats called');
    setStatsLoading(true);
    try {
      const result = await AdminUsersService.getUserStats();
      console.log('📊 [useUsers] Stats result:', result);
      
      if (result.success && result.data) {
        setStats(result.data);
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch stats';
      console.error('❌ [useUsers] Stats error:', errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // Fetch stats on mount
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const fetchUsers = useCallback(async (filters?: UserFilters): Promise<FetchUsersResult> => {
    console.log('🔍 fetchUsers called with filters:', filters); 
    setLoading(true);
    setError(null);
    try {
      const result = await AdminUsersService.getUsers(filters);
      if (result.success && result.data) {
        setUsers(result.data.users);
        setPagination(prev => ({
          ...prev,
          total: result.data?.pagination?.total || 0,
          pages: result.data?.pagination?.pages || 1,
        }));
        return { 
          success: true, 
          data: {
            users: result.data.users,
            pagination: result.data.pagination
          } 
        };
      } else {
        setError(result.message || 'Failed to load users');
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

  const getUserDetails = useCallback(async (userId: string): Promise<FetchUserDetailsResult> => {
    try {
      const result = await AdminUsersService.getUserById(userId);
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      return { success: false, message: errorMessage };
    }
  }, []);

  const refresh = useCallback(async (): Promise<void> => {
    console.log('🔄 [useUsers] Manual refresh');
    await Promise.all([
      fetchUsers({ page: pagination.page, limit: pagination.limit }),
      fetchStats()
    ]);
  }, [fetchUsers, fetchStats, pagination.page, pagination.limit]);

  return {
    users,
    loading: loading || statsLoading,
    error,
    stats,
    pagination,
    fetchUsers,
    fetchStats,
    getUserDetails,
    refresh,
    setPagination,
  }; 
}