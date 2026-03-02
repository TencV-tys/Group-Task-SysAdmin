import { useState, useCallback } from 'react';
import { AdminUsersService } from '../services/admin.users.service';
import type { User, UserFilters } from '../services/admin.users.service';

export function useUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchUsers = useCallback(async (filters?: UserFilters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminUsersService.getUsers(filters);
      
      if (result.success && result.data) {
        setUsers(result.data.users);
        setPagination(result.data.pagination);
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to load users');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred while fetching users';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const getUserDetails = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminUsersService.getUserById(userId);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to load user details');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load user details';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setUsers([]);
    setError(null);
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0
    });
  }, []);

  return {
    users,
    loading,
    error,
    pagination,
    fetchUsers,
    getUserDetails,
    reset
  };
}