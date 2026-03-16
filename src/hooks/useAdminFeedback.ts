// hooks/useAdminFeedback.ts - Simplified without cache
import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import type { 
  Feedback, 
  FeedbackFilters,  
  FeedbackStats, 

} from '../services/admin.feedback.service';

export function useAdminFeedback() {
  console.log('🏭 [useAdminFeedback] Hook initializing');
  
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [actionLoading, setActionLoading] = useState(false);

  const isMountedRef = useRef(true);
  const fetchCountRef = useRef(0);
  const statsFetchedRef = useRef(false);
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
    
    // Prevent concurrent fetches
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

  // ===== FETCH STATISTICS =====
  const fetchStats = useCallback(async () => {
    console.log('📊 [useAdminFeedback] fetchStats called');
    
    if (statsFetchedRef.current) {
      console.log('⏭️ [useAdminFeedback] fetchStats skipped - already fetched once');
      return { success: true, data: stats };
    }
    
    try {
      const result = await AdminFeedbackService.getFeedbackStats();
      console.log('📦 [useAdminFeedback] getFeedbackStats response:', {
        success: result.success,
        hasStats: !!result.data,
        message: result.message
      });
      
      if (result.success && result.data && isMountedRef.current) {
        setStats(result.data);
        statsFetchedRef.current = true;
        console.log('✅ [useAdminFeedback] Statistics updated:', result.data);
      } else if (isMountedRef.current) {
        console.error('❌ [useAdminFeedback] Failed to fetch stats:', result.message);
      }
      return result;
    } catch (err) {
      console.error('❌ [useAdminFeedback] Exception in fetchStats:', err);
      return { success: false, message: 'Failed to fetch stats' };
    }
  }, [stats]);

  // ===== GET FEEDBACK DETAILS =====
  const getFeedbackDetails = useCallback(async (feedbackId: string) => {
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
  const updateStatus = useCallback(async (feedbackId: string, status: string) => {
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
        // Refresh stats after update
        statsFetchedRef.current = false;
        await fetchStats();
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
  }, [fetchStats]);

  // ===== DELETE FEEDBACK =====
  const deleteFeedback = useCallback(async (feedbackId: string) => {
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
        // Refresh stats after delete
        statsFetchedRef.current = false;
        await fetchStats();
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
  }, [fetchStats]);

  // ===== REFRESH =====
  const refreshFeedback = useCallback(async (filters?: FeedbackFilters) => {
    console.log('🔄 [useAdminFeedback] Manual refresh triggered');
    statsFetchedRef.current = false;
    await Promise.all([
      fetchFeedback(filters),
      fetchStats()
    ]);
  }, [fetchFeedback, fetchStats]);

  console.log('📊 [useAdminFeedback] Current state:', {
    feedbackCount: feedback.length,
    loading,
    hasError: !!error,
    hasStats: !!stats,
    pagination,
    actionLoading
  });

  return {
    feedback,
    loading,
    error,
    stats,
    pagination,
    actionLoading,
    fetchFeedback,
    fetchStats,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    refreshFeedback,
  };
}