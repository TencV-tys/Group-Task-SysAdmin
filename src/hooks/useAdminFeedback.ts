// hooks/useAdminFeedback.ts - Add version counter

import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import { adminSocket, connectAdminSocket } from '../services/adminSocket';
import type { 
  Feedback, 
  FeedbackFilters,  
  FeedbackStats,  
  FeedbackDetailsResponse, 
  UpdateStatusResponse,
  DeleteResponse
} from '../services/admin.feedback.service';

export function useAdminFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<FeedbackStats | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const [hasNewFeedback, setHasNewFeedback] = useState(false);
  const [filters, setFilters] = useState<FeedbackFilters>({ page: 1, limit: 10 });
  // ADD THIS: Version counter to force re-renders
  const [statsVersion, setStatsVersion] = useState(0);

  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const isDeletingRef = useRef(false);
  const fetchCountRef = useRef(0);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    isMountedRef.current = true;
    connectAdminSocket().catch(console.error);
    return () => { isMountedRef.current = false; };
  }, []);

  const buildApiFilters = useCallback((customFilters?: FeedbackFilters): FeedbackFilters => {
    const currentFilters = customFilters || filters;
    return {
      page: currentFilters.page || 1,
      limit: currentFilters.limit || 10,
      status: currentFilters.status,
      search: currentFilters.search,
      type: currentFilters.type,
      sortBy: currentFilters.sortBy,
      sortOrder: currentFilters.sortOrder,
    };
  }, [filters]);

  const fetchFeedback = useCallback(async (filterParams?: FeedbackFilters) => {
    const fetchId = ++fetchCountRef.current;
    console.log(`📤 [fetchFeedback:${fetchId}] called`);
    
    if (!isMountedRef.current) return { success: false, message: 'Unmounted' };

    setLoading(true);
    setError(null);

    const finalFilters = buildApiFilters(filterParams);
    console.log(`📤 [fetchFeedback:${fetchId}] finalFilters:`, finalFilters);

    try {
      const result = await AdminFeedbackService.getFeedback(finalFilters);

      if (isMountedRef.current) {
        if (result.success && result.data) {
          console.log(`✅ [fetchFeedback:${fetchId}] Setting feedback count:`, result.data.feedback?.length);
          setFeedback(result.data.feedback || []);
          setPagination({
            page: result.data.pagination.page,
            limit: result.data.pagination.limit,
            total: result.data.pagination.total,
            pages: result.data.pagination.pages
          });
          setHasNewFeedback(false);
          return { success: true, data: result.data };
        } else {
          setError(result.message || 'Failed to load feedback');
          return { success: false, message: result.message };
        }
      }
    } catch (err) {
      console.error(`❌ [fetchFeedback:${fetchId}] ERROR:`, err);
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Network error';
        setError(errorMessage);
        return { success: false, message: errorMessage };
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
    
    return { success: false, message: 'Unknown error' };
  }, [buildApiFilters]);

  const fetchGlobalStats = useCallback(async () => {
    console.log('📊 [fetchGlobalStats] called');
    try {
      const result = await AdminFeedbackService.getFeedbackStats();
      console.log('📊 [fetchGlobalStats] result from API:', result);
      
      if (result.success && result.data && isMountedRef.current) {
        console.log('✅ [fetchGlobalStats] Setting globalStats to NEW object:', result.data);
        // Create a brand new object with spread operator
        const newStats = { ...result.data };
        setGlobalStats(newStats);
        // INCREMENT VERSION COUNTER to force re-render
        setStatsVersion(prev => prev + 1);
        return { success: true, data: newStats };
      }
      return { success: false, message: result.message };
    } catch (err) {
      console.error('❌ [fetchGlobalStats] ERROR:', err);
      return { success: false, message: 'Failed to fetch global stats' };
    }
  }, []);

  const getFeedbackDetails = useCallback(async (feedbackId: string): Promise<FeedbackDetailsResponse> => {
    console.log('🔍 [getFeedbackDetails] called for:', feedbackId);
    try {
      return await AdminFeedbackService.getFeedbackById(feedbackId);
    } catch (err) {
      console.error('❌ [getFeedbackDetails] ERROR:', err);
      return { success: false, message: 'Failed to fetch feedback details' };
    }
  }, []);

  const updateStatus = useCallback(async (feedbackId: string, status: string): Promise<UpdateStatusResponse> => {
    console.log('🔄 [updateStatus] called:', { feedbackId, status });
    setActionLoading(true);
    try {
      const result = await AdminFeedbackService.updateFeedbackStatus(feedbackId, status);
      console.log('🔄 [updateStatus] result:', result);
      if (result.success && isMountedRef.current) {
        console.log('🔄 [updateStatus] Refreshing stats and feedback...');
        await fetchGlobalStats();
        await fetchFeedback(filtersRef.current);
        setStatsVersion(prev => prev + 1);
      }
      return result;
    } catch (err) {
      console.error('❌ [updateStatus] ERROR:', err);
      return { success: false, message: 'Failed to update status' };
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
  }, [fetchGlobalStats, fetchFeedback]);

  const deleteFeedback = useCallback(async (feedbackId: string): Promise<DeleteResponse> => {
    console.log('🗑️ [deleteFeedback] called:', feedbackId);
    if (isDeletingRef.current) {
      console.log('⏭️ Delete already in progress, skipping');
      return { success: false, message: 'Delete already in progress' };
    }
    
    isDeletingRef.current = true;
    setActionLoading(true);
    
    try {
      const result = await AdminFeedbackService.deleteFeedback(feedbackId);
      if (result.success && isMountedRef.current) {
        console.log('🗑️ [deleteFeedback] Refreshing stats and feedback...');
        await Promise.all([
          fetchGlobalStats(),
          fetchFeedback(filtersRef.current)
        ]);
        setStatsVersion(prev => prev + 1);
      }
      return result;
    } catch (err) {
      console.error('❌ [deleteFeedback] ERROR:', err);
      return { success: false, message: 'Failed to delete feedback' };
    } finally {
      if (isMountedRef.current) setActionLoading(false);
      isDeletingRef.current = false;
    }
  }, [fetchGlobalStats, fetchFeedback]);

  const updateFilters = useCallback((newFilters: FeedbackFilters) => {
    console.log('🔵 [updateFilters] called:', newFilters);
    const mergedFilters = { ...filters, ...newFilters };
    console.log('🔵 [updateFilters] mergedFilters:', mergedFilters);
    setFilters(mergedFilters);
    fetchFeedback(mergedFilters);
    fetchGlobalStats();
  }, [filters, fetchFeedback, fetchGlobalStats]);

  const refreshFeedback = useCallback(async () => {
    console.log('🔄 [refreshFeedback] called');
    await Promise.all([fetchFeedback(filtersRef.current), fetchGlobalStats()]);
    setStatsVersion(prev => prev + 1);
  }, [fetchFeedback, fetchGlobalStats]);

  // Socket listeners
  useEffect(() => {
    console.log('🔌🔌🔌 Setting up socket listeners... 🔌🔌🔌');
    
    const handleFeedbackStatus = (data: any) => {
      console.log('🎯🎯🎯 [SOCKET] feedback:status RECEIVED! 🎯🎯🎯');
      console.log('📦 Socket data:', data);
      
      if (!isMountedRef.current) return;
      
      setFeedback(prev => prev.map(f => 
        f.id === data.feedbackId ? { ...f, status: data.newStatus } : f
      ));
      
      fetchGlobalStats();
      fetchFeedback(filtersRef.current);
      setStatsVersion(prev => prev + 1);
    };
    
    const handleFeedbackNew = (data: any) => {
      console.log('🎯🎯🎯 [SOCKET] feedback:new RECEIVED! 🎯🎯🎯');
      if (!isMountedRef.current) return;
      setHasNewFeedback(true);
      fetchGlobalStats();
      fetchFeedback(filtersRef.current);
      setStatsVersion(prev => prev + 1);
    };
    
    const handleFeedbackDeleted = (data: any) => {
      console.log('🎯🎯🎯 [SOCKET] feedback:deleted RECEIVED! 🎯🎯🎯');
      if (!isMountedRef.current) return;
      setFeedback(prev => prev.filter(f => f.id !== data.feedbackId));
      fetchGlobalStats();
      fetchFeedback(filtersRef.current);
      setStatsVersion(prev => prev + 1);
    };
    
    const handleFeedbackUpdated = (data: any) => {
      console.log('🎯🎯🎯 [SOCKET] feedback:updated RECEIVED! 🎯🎯🎯');
      if (!isMountedRef.current) return;
      fetchGlobalStats();
      fetchFeedback(filtersRef.current);
      setStatsVersion(prev => prev + 1);
    };
    
    adminSocket.on('feedback:status', handleFeedbackStatus);
    adminSocket.on('feedback:new', handleFeedbackNew);
    adminSocket.on('feedback:user:created', handleFeedbackNew);
    adminSocket.on('feedback:deleted', handleFeedbackDeleted);
    adminSocket.on('feedback:updated', handleFeedbackUpdated);
    adminSocket.on('feedback:user:updated', handleFeedbackUpdated);
    
    console.log('✅ Socket listeners registered successfully');
    
    return () => {
      adminSocket.off('feedback:status', handleFeedbackStatus);
      adminSocket.off('feedback:new', handleFeedbackNew);
      adminSocket.off('feedback:user:created', handleFeedbackNew);
      adminSocket.off('feedback:deleted', handleFeedbackDeleted);
      adminSocket.off('feedback:updated', handleFeedbackUpdated);
      adminSocket.off('feedback:user:updated', handleFeedbackUpdated);
    };
  }, [fetchGlobalStats, fetchFeedback]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      console.log('🚀 Initial load starting...');
      initialLoadDoneRef.current = true;
      fetchFeedback({ page: 1, limit: 10 });
      fetchGlobalStats();
    }
  }, [fetchFeedback, fetchGlobalStats]);

  return {
    feedback,
    loading,
    error,
    globalStats,
    pagination,
    actionLoading,
    hasNewFeedback,
    currentFilters: filters,
    statsVersion, // ADD THIS to return
    fetchFeedback,
    fetchGlobalStats,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    refreshFeedback,
    updateFilters,
  };
}