import { useState, useCallback, useEffect, useRef } from 'react';
import type { Admin } from '../services/admin.auth.service';
import { AdminAuthService } from '../services/admin.auth.service';

// Cache admin data globally (outside hook)
let cachedAdmin: Admin | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Define return type for login/logout
interface AuthResponse {
  success: boolean;
  message: string;
  admin?: Admin;
}

export function useAdminAuth() {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    // Initialize with cached data if available
    const now = Date.now();
    if (cachedAdmin && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Using cached admin data');
      return cachedAdmin;
    }
    return null;
  });
  
  const [loading, setLoading] = useState<boolean>(() => {
    // Not loading if we have valid cache
    const now = Date.now();
    return !(cachedAdmin && (now - cacheTimestamp) < CACHE_DURATION);
  });
  
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  
  // Add a ref to track if we've already checked auth
  const hasCheckedRef = useRef(false);
  
  // Fix: Use specific type instead of any
  const pendingRequestRef = useRef<Promise<Admin | null | undefined> | null>(null);

  const checkAuth = useCallback(async (force = false) => {
    // Return cached data if valid and not forced
    const now = Date.now();
    if (!force && cachedAdmin && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('📦 Returning cached admin data');
      setAdmin(cachedAdmin);
      setLoading(false);
      return cachedAdmin;
    }

    // Prevent multiple simultaneous requests
    if (hasCheckedRef.current && pendingRequestRef.current) {
      console.log('⏳ Auth check already in progress, returning existing promise');
      return pendingRequestRef.current;
    }
    
    hasCheckedRef.current = true;
    setLoading(true);
    
    const promise = (async () => {
      try {
        console.log('🔍 Checking authentication...');
        const adminData = await AdminAuthService.getCurrentAdmin();
        console.log('🔍 Auth check result:', adminData);
        
        if (adminData) {
          // Update cache
          cachedAdmin = adminData;
          cacheTimestamp = Date.now();
          setAdmin(adminData);
        } else {
          // Clear cache on no admin
          cachedAdmin = null;
          cacheTimestamp = 0;
          setAdmin(null);
        }
        
        return adminData;
      } catch (error) {
        console.error('Auth check error:', error);
        // Clear cache on error
        cachedAdmin = null;
        cacheTimestamp = 0;
        setAdmin(null);
        throw error;
      } finally {
        setLoading(false);
        pendingRequestRef.current = null;
      }
    })();
    
    pendingRequestRef.current = promise;
    return promise;
  }, []);

  useEffect(() => {
    checkAuth();
    
    // Cleanup function to reset on unmount
    return () => {
      hasCheckedRef.current = false;
      pendingRequestRef.current = null;
    };
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);
    setAuthError(false);

    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      console.log(`📥 useAdminAuth: Logging in as ${email}`);
      const result = await AdminAuthService.login({ email, password });
      console.log('📥 useAdminAuth: Login result:', result);

      if (result.success && result.admin) {
        // Update cache on successful login
        cachedAdmin = result.admin;
        cacheTimestamp = Date.now();
        
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
      // Reset the ref on login attempt
      hasCheckedRef.current = false;
      pendingRequestRef.current = null;
    } 
  }, []);

  const logout = useCallback(async (): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminAuthService.logout();
      
      if (result.success) {
        // Clear cache on logout
        cachedAdmin = null;
        cacheTimestamp = 0;
        
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
      // Reset the ref on logout
      hasCheckedRef.current = false;
      pendingRequestRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setAuthError(false);
    hasCheckedRef.current = false;
    pendingRequestRef.current = null;
  }, []);

  const refreshAdmin = useCallback(async () => {
    // Force refresh, bypass cache
    return checkAuth(true);
  }, [checkAuth]);

  return {
    admin,
    loading,
    error,
    authError,
    login,
    logout,
    reset,
    refreshAdmin,
    isAuthenticated: !!admin
  };
}