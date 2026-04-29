// hooks/useAdminAuth.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import type { Admin } from '../services/admin.auth.service';
import { AdminAuthService } from '../services/admin.auth.service';

// Cache admin data globally (outside hook)
let cachedAdmin: Admin | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface AuthResponse {
  success: boolean;
  message: string;
  admin?: Admin;
  remainingAttempts?: number;
  isLocked?: boolean;
  lockoutMinutes?: number;
}

export function useAdminAuth() {
  const [admin, setAdmin] = useState<Admin | null>(() => {
    const now = Date.now();
    if (cachedAdmin && (now - cacheTimestamp) < CACHE_DURATION) {
      return cachedAdmin;
    }
    return null;
  });
  
  const [loading, setLoading] = useState<boolean>(() => {
    const now = Date.now();
    return !(cachedAdmin && (now - cacheTimestamp) < CACHE_DURATION);
  });
  
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<boolean>(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockoutMinutes, setLockoutMinutes] = useState<number | null>(null);
  
  const hasCheckedRef = useRef(false);
  const pendingRequestRef = useRef<Promise<Admin | null | undefined> | null>(null);

  const checkAuth = useCallback(async (force = false) => {
    const now = Date.now();
    if (!force && cachedAdmin && (now - cacheTimestamp) < CACHE_DURATION) {
      setAdmin(cachedAdmin);
      setLoading(false);
      return cachedAdmin;
    }

    if (hasCheckedRef.current && pendingRequestRef.current) {
      return pendingRequestRef.current;
    }
    
    hasCheckedRef.current = true;
    setLoading(true);
    
    const promise = (async () => {
      try {
        const adminData = await AdminAuthService.getCurrentAdmin();
        
        if (adminData) {
          cachedAdmin = adminData;
          cacheTimestamp = Date.now();
          setAdmin(adminData);
        } else {
          cachedAdmin = null;
          cacheTimestamp = 0;
          setAdmin(null);
        }
        
        return adminData;
      } catch (error) {
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
    return () => {
      hasCheckedRef.current = false;
      pendingRequestRef.current = null;
    };
  }, [checkAuth]);

  const login = useCallback(async (email: string, password: string): Promise<AuthResponse> => {
    setLoading(true);
    setError(null);
    setAuthError(false);
    setRemainingAttempts(null);
    setIsLocked(false);
    setLockoutMinutes(null);

    try {
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      const result = await AdminAuthService.login({ email, password });

      if (result.success && result.admin) {
        cachedAdmin = result.admin;
        cacheTimestamp = Date.now();
        setAdmin(result.admin);
        
        return {
          success: true,
          message: result.message,
          admin: result.admin
        };
      } else {
        // Handle rate limiting response
        if (result.remainingAttempts !== undefined) {
          setRemainingAttempts(result.remainingAttempts);
          if (result.isLocked) {
            setIsLocked(true);
            setLockoutMinutes(result.lockoutMinutes || 15);
          }
        }
        
        setError(result.message || 'Login failed');
        
        if (result.message?.toLowerCase().includes('invalid') || 
            result.message?.toLowerCase().includes('not found')) {
          setAuthError(true);
        }
        
        return {
          success: false,
          message: result.message,
          remainingAttempts: result.remainingAttempts,
          isLocked: result.isLocked,
          lockoutMinutes: result.lockoutMinutes
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
        cachedAdmin = null;
        cacheTimestamp = 0;
        setAdmin(null);
        setRemainingAttempts(null);
        setIsLocked(false);
        setLockoutMinutes(null);
      }
      
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Logout failed';
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      setLoading(false);
      hasCheckedRef.current = false;
      pendingRequestRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setAuthError(false);
    setRemainingAttempts(null);
    setIsLocked(false);
    setLockoutMinutes(null);
    hasCheckedRef.current = false;
    pendingRequestRef.current = null;
  }, []);

  const refreshAdmin = useCallback(async () => {
    return checkAuth(true);
  }, [checkAuth]);

  return {
    admin,
    loading,
    error,
    authError,
    remainingAttempts,
    isLocked,
    lockoutMinutes,
    login,
    logout,
    reset,
    refreshAdmin,
    isAuthenticated: !!admin
  };
}