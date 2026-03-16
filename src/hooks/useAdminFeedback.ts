// hooks/useAdminFeedback.ts - COMPLETE WITH FILTERED STATS
import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import type { 
  Feedback, 
  FeedbackFilters,  
  FeedbackStats, 
  FeedbackDetailsResponse,
  UpdateStatusResponse,
  DeleteResponse
} from '../services/admin.feedback.service';

export function useAdminFeedback() {
  console.log('🏭 [useAdminFeedback] Hook initializing');
  
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<FeedbackStats | null>(null);
  const [filteredStats, setFilteredStats] = useState<FeedbackStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [actionLoading, setActionLoading] = useState(false);

  const isMountedRef = useRef(true);
  const fetchCountRef = useRef(0);
  const globalStatsFetchedRef = useRef(false);
  const fetchInProgressRef = useRef(false);

  useEffect(() => {
    console.log('🟢 [useAdminFeedback] Hook mounted');
    isMountedRef.current = true;
    return () => {
      console.log('🔴 [useAdminFeedback] Hook unmounted');
      isMountedRef.current = false;
    };
  }, []);

  // ===== FETCH FEEDBACK =====
  const fetchFeedback = useCallback(async (filters?: FeedbackFilters) => {
    const fetchId = ++fetchCountRef.current;
    console.log(`📤 [useAdminFeedback:${fetchId}] fetchFeedback called with filters:`, filters);
    
    if (fetchInProgressRef.current) {
      console.log(`⏭️ [useAdminFeedback:${fetchId}] Skipping - fetch already in progress`);
      return { success: false, message: 'Fetch already in progress' };
    }
    
    setLoading(true);
    setError(null);
    fetchInProgressRef.current = true;
    
    try {
      const result = await AdminFeedbackService.getFeedback(filters);
      console.log(`📦 [useAdminFeedback:${fetchId}] getFeedback response:`, {
        success: result.success,
        feedbackCount: result.data?.feedback?.length,
        pagination: result.data?.pagination,
        message: result.message
      });
      
      if (result.success && result.data && isMountedRef.current) {
        setFeedback(result.data.feedback || []);
        setPagination({
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          total: result.data.pagination.total,
          pages: result.data.pagination.pages
        });
        console.log(`✅ [useAdminFeedback:${fetchId}] Feedback updated:`, {
          count: result.data.feedback?.length,
          total: result.data.pagination.total
        });
        return { success: true, data: result.data };
      } else if (isMountedRef.current) {
        console.error(`❌ [useAdminFeedback:${fetchId}] Failed to fetch feedback:`, result.message);
        setError(result.message || 'Failed to load feedback');
        return { success: false, message: result.message };
      }
    } catch (err) {
      if (!isMountedRef.current) return { success: false, message: 'Component unmounted' };
      
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      console.error(`❌ [useAdminFeedback:${fetchId}] Exception:`, errorMessage, err);
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        fetchInProgressRef.current = false;
        console.log(`🏁 [useAdminFeedback:${fetchId}] fetchFeedback completed`);
      }
    }
  }, []);

  // ===== FETCH GLOBAL STATISTICS =====
  const fetchGlobalStats = useCallback(async (force: boolean = false) => {
    console.log('📊 [useAdminFeedback] fetchGlobalStats called', force ? '(forced)' : '');
    
    if (!force && globalStatsFetchedRef.current) {
      console.log('⏭️ [useAdminFeedback] fetchGlobalStats skipped - already fetched once');
      return { success: true, data: globalStats };
    }
    
    try {
      const result = await AdminFeedbackService.getFeedbackStats();
      console.log('📦 [useAdminFeedback] getFeedbackStats response:', {
        success: result.success,
        hasStats: !!result.data,
        message: result.message
      });
      
      if (result.success && result.data && isMountedRef.current) {
        setGlobalStats(result.data);
        if (!force) {
          globalStatsFetchedRef.current = true;
        }
        console.log('✅ [useAdminFeedback] Global statistics updated:', result.data);
        return { success: true, data: result.data };
      } else if (isMountedRef.current) {
        console.error('❌ [useAdminFeedback] Failed to fetch global stats:', result.message);
        return { success: false, message: result.message };
      }
    } catch (err) {
      console.error('❌ [useAdminFeedback] Exception in fetchGlobalStats:', err);
      return { success: false, message: 'Failed to fetch global stats' };
    }
  }, [globalStats]);

 // ===== FETCH FILTERED STATISTICS =====
const fetchFilteredStats = useCallback(async (filters?: { status?: string, type?: string, search?: string }) => {
  console.log('📊 [useAdminFeedback] fetchFilteredStats called with filters:', filters);
  
  try {
    const result = await AdminFeedbackService.getFilteredFeedbackStats(filters);
    console.log('📦 [useAdminFeedback] getFilteredFeedbackStats response:', {
      success: result.success,
      hasStats: !!result.data,
      message: result.message
    });
    
    if (result.success && result.data && isMountedRef.current) {
      setFilteredStats(result.data);
      console.log('✅ [useAdminFeedback] Filtered statistics updated:', result.data);
      return { success: true, data: result.data };
    } else if (isMountedRef.current) {
      // If no data, set to zeros based on current filter
      setFilteredStats({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        byType: {}
      });
      console.error('❌ [useAdminFeedback] Failed to fetch filtered stats:', result.message);
      return { success: false, message: result.message };
    }
  } catch (err) {
    console.error('❌ [useAdminFeedback] Exception in fetchFilteredStats:', err);
    // Reset to zeros on error
    if (isMountedRef.current) {
      setFilteredStats({
        total: 0,
        open: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        byType: {}
      });
    }
    return { success: false, message: 'Failed to fetch filtered stats' };
  }
}, []);

  // ===== GET FEEDBACK DETAILS =====
  const getFeedbackDetails = useCallback(async (feedbackId: string): Promise<FeedbackDetailsResponse> => {
    console.log('🔎 [useAdminFeedback] getFeedbackDetails called for:', feedbackId);
    
    try {
      const result = await AdminFeedbackService.getFeedbackById(feedbackId);
      console.log('📦 [useAdminFeedback] getFeedbackDetails response:', {
        success: result.success,
        hasData: !!result.data,
        message: result.message
      });
      return result;
    } catch (err) {
      console.error('❌ [useAdminFeedback] Exception in getFeedbackDetails:', err);
      return { success: false, message: 'Failed to fetch feedback details' };
    }
  }, []);

  // ===== UPDATE STATUS =====
  const updateStatus = useCallback(async (feedbackId: string, status: string): Promise<UpdateStatusResponse> => {
    console.log(`🎬 [useAdminFeedback] updateStatus called:`, { feedbackId, status });
    setActionLoading(true);
    
    try {
      const result = await AdminFeedbackService.updateFeedbackStatus(feedbackId, status);
      console.log(`📦 [useAdminFeedback] updateStatus response:`, {
        success: result.success,
        message: result.message
      });
      
      if (result.success && isMountedRef.current) {
        console.log(`✅ [useAdminFeedback] Status updated successfully`);
        globalStatsFetchedRef.current = false;
        await fetchGlobalStats(true);
      }
      return result;
    } catch (err) {
      console.error(`❌ [useAdminFeedback] Exception in updateStatus:`, err);
      return { success: false, message: 'Failed to update status' };
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
        console.log(`🏁 [useAdminFeedback] actionLoading set to false`);
      }
    }
  }, [fetchGlobalStats]);

  // ===== DELETE FEEDBACK =====
  const deleteFeedback = useCallback(async (feedbackId: string): Promise<DeleteResponse> => {
    console.log(`🗑️ [useAdminFeedback] deleteFeedback called:`, feedbackId);
    setActionLoading(true);
    
    try {
      const result = await AdminFeedbackService.deleteFeedback(feedbackId);
      console.log(`📦 [useAdminFeedback] deleteFeedback response:`, {
        success: result.success,
        message: result.message
      });
      
      if (result.success && isMountedRef.current) {
        console.log(`✅ [useAdminFeedback] Delete successful`);
        globalStatsFetchedRef.current = false;
        await fetchGlobalStats(true);
      }
      return result;
    } catch (err) {
      console.error(`❌ [useAdminFeedback] Exception in deleteFeedback:`, err);
      return { success: false, message: 'Failed to delete feedback' };
    } finally {
      if (isMountedRef.current) {
        setActionLoading(false);
        console.log(`🏁 [useAdminFeedback] actionLoading set to false`);
      }
    }
  }, [fetchGlobalStats]);

  // ===== REFRESH =====
  const refreshFeedback = useCallback(async (filters?: FeedbackFilters) => {
    console.log('🔄 [useAdminFeedback] Manual refresh triggered');
    globalStatsFetchedRef.current = false;
    await Promise.all([
      fetchFeedback(filters),
      fetchGlobalStats(true),
      fetchFilteredStats(filters)
    ]);
  }, [fetchFeedback, fetchGlobalStats, fetchFilteredStats]);

  console.log('📊 [useAdminFeedback] Current state:', {
    feedbackCount: feedback.length,
    loading,
    hasError: !!error,
    hasGlobalStats: !!globalStats,
    hasFilteredStats: !!filteredStats,
    pagination,
    actionLoading
  });

  return {
    feedback,
    loading,
    error,
    globalStats,
    filteredStats,
    pagination,
    actionLoading,
    fetchFeedback,
    fetchGlobalStats,
    fetchFilteredStats,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    refreshFeedback,
  };
}