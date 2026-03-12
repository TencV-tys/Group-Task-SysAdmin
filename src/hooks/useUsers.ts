// hooks/useUsers.ts
import { useState, useCallback } from 'react';
import { AdminUsersService } from '../services/admin.users.service';
import type { User, UserFilters, UserDetails,} from '../services/admin.users.service';

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

interface UseUsersReturn {
  users: User[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  fetchUsers: (filters?: UserFilters) => Promise<FetchUsersResult>;
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
  const [pagination, setPagination] = useState({
    page: 1,
    limit: initialLimit,
    total: 0,
    pages: 1,
  });

  const fetchUsers = useCallback(async (filters?: UserFilters): Promise<FetchUsersResult> => {
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
    await fetchUsers({ page: pagination.page, limit: pagination.limit });
  }, [fetchUsers, pagination.page, pagination.limit]);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    getUserDetails,
    refresh,
    setPagination,
  };
}