import { useState, useCallback, useEffect } from 'react';
import type { Admin } from '../services/admin.auth.service';
import { AdminAuthService } from '../services/admin.auth.service';

export function useAdminAuth() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);

  const checkAuth = useCallback(async () => {
    try {
      const adminData = await AdminAuthService.getCurrentAdmin();
      setAdmin(adminData);
    } catch (error) {
      console.error('Auth check error:', error);
    }
  }, []); // Empty dependency is fine - checkAuth doesn't depend on any props/state

  useEffect(() => {
    checkAuth();
  }, [checkAuth]); // ✅ Added checkAuth to dependency array

  const login = useCallback(async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      console.log(`📥 useAdminAuth: Logging in as ${email}`);
      const result = await AdminAuthService.login({ email, password });

      if (result.success && result.admin) {
        setAdmin(result.admin);
        console.log('✅ useAdminAuth: Login successful');
        return {
          success: true,
          message: result.message,
          admin: result.admin
        };
      } else {
        setError(result.message || 'Login failed');
        
        if (result.message?.toLowerCase().includes('invalid') || 
            result.message?.toLowerCase().includes('not found')) {
          setAuthError(true);
        }
        
        return {
          success: false,
          message: result.message
        };
      }

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminAuthService.logout();
      
      if (result.success) {
        setAdmin(null);
        console.log('✅ useAdminAuth: Logout successful');
      }
      
      return result;
    } catch (err: unknown) {
      console.error('❌ useAdminAuth: Logout error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setAuthError(false);
  }, []);

  return {
    admin,
    loading,
    error,
    authError,
    login,
    logout,
    reset,
    isAuthenticated: !!admin
  };
}