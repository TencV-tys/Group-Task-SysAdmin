// hooks/useAdminFeedback.ts
import { useCallback, useState, useRef, useEffect } from 'react';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import { useDataCache } from './useDataCache';
import type { 
  Feedback, 
  FeedbackFilters,  
  FeedbackStats, 
  FeedbackDetails,
  FeedbackListResponse 
} from '../services/admin.feedback.service';

interface FeedbackListData {
  feedback: Feedback[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface FetchFeedbackResult {
  success: boolean;
  data?: FeedbackListResponse['data'];
  message?: string;
}

interface FetchStatsResult {
  success: boolean;
  data?: FeedbackStats;
  message?: string;
}

interface FetchDetailsResult {
  success: boolean;
  data?: FeedbackDetails;
  message?: string;
}

interface UpdateStatusResult {
  success: boolean;
  data?: FeedbackDetails;
  message?: string;
}

interface DeleteResult {
  success: boolean;
  message?: string;
}

export function useAdminFeedback() {
  // Operation-specific loading states
  const [fetchLoading, setFetchLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  
  // Refs
  const isMountedRef = useRef(true);
  const refreshInProgress = useRef(false);
  const statsFetchedRef = useRef(false);

  // Cache for feedback list
  const {
    data: feedbackData,
    loading: cacheLoading,
    error: cacheError,
    refresh: refreshFeedbackCache
  } = useDataCache<FeedbackListData>(
    'admin-feedback',
    async () => {
      const result = await AdminFeedbackService.getFeedback({ limit: 10 });
      if (result.success && result.data) {
        return {
          feedback: result.data.feedback,
          pagination: result.data.pagination
        };
      }
      throw new Error(result.message || 'Failed to fetch feedback');
    },
    30 * 1000
  );

  // Cache for stats - useDataCache but don't auto-fetch
  const {
    data: stats,
    refresh: refreshStatsCache
  } = useDataCache<FeedbackStats>(
    'admin-feedback-stats',
    async () => {
      const result = await AdminFeedbackService.getFeedbackStats();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to fetch stats');
    },
    30 * 1000
  );

  // Combined loading state
  const loading = cacheLoading || fetchLoading || updateLoading;
  const error = cacheError;

  const pagination = feedbackData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  };

  // Silent refresh function (doesn't affect fetchLoading)
  const silentRefresh = useCallback(async () => {
    if (refreshInProgress.current || !isMountedRef.current) return;
    
    refreshInProgress.current = true;
    console.log('🔄 Silent feedback refresh started');
    
    try {
      await Promise.all([
        refreshFeedbackCache(),
        refreshStatsCache()
      ]);
      console.log('✅ Silent feedback refresh complete');
    } catch (error) {
      console.error('❌ Silent feedback refresh failed:', error);
    } finally {
      refreshInProgress.current = false;
    }
  }, [refreshFeedbackCache, refreshStatsCache]);

  const fetchFeedback = useCallback(async (filters?: FeedbackFilters): Promise<FetchFeedbackResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    console.log('📥 fetchFeedback started with filters:', filters);
    setFetchLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing fetchLoading to false');
        setFetchLoading(false);
      }
    }, 5000);
    
    try {
      const result = await AdminFeedbackService.getFeedback(filters);
      
      console.log('📥 fetchFeedback result:', result);
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success && result.data) {
        // Update cache with new data
        if (result.data) {
          // Manually update cache or trigger refresh
          await refreshFeedbackCache();
        }
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch feedback';
      return { success: false, message: errorMessage };
    } finally {
      console.log('📥 fetchFeedback finally block - setting fetchLoading to false');
      clearTimeout(safetyTimeout);
      
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setFetchLoading(false);
            console.log('✅ fetchFeedback set to false');
          }
        }, 100);
      }
    }
  }, [refreshFeedbackCache]);

  const fetchStats = useCallback(async (): Promise<FetchStatsResult> => {
    // Prevent multiple stats calls
    if (statsFetchedRef.current) {
      console.log('📊 Stats already fetched, returning cached');
      return { success: true, data: stats || undefined };
    }
    
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    console.log('📥 fetchStats started');
    statsFetchedRef.current = true;
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - stats fetch taking too long');
      }
    }, 5000);
    
    try {
      const result = await AdminFeedbackService.getFeedbackStats();
      
      console.log('📥 fetchStats result:', result);
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success && result.data) {
        await refreshStatsCache();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
      return { success: false, message: errorMessage };
    }
  }, [refreshStatsCache, stats]);

  const getFeedbackDetails = useCallback(async (feedbackId: string): Promise<FetchDetailsResult> => {
    try {
      const result = await AdminFeedbackService.getFeedbackById(feedbackId);
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load details';
      return { success: false, message: errorMessage };
    }
  }, []);

  const updateStatus = useCallback(async (feedbackId: string, status: string): Promise<UpdateStatusResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    console.log('📥 updateStatus started:', { feedbackId, status });
    setUpdateLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing updateLoading to false');
        setUpdateLoading(false);
      }
    }, 5000);

    try {
      const result = await AdminFeedbackService.updateFeedbackStatus(feedbackId, status);
      
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('feedback-updated'));
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update';
      return { success: false, message: errorMessage };
    } finally {
      clearTimeout(safetyTimeout);
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setUpdateLoading(false);
            console.log('✅ updateLoading set to false');
          }
        }, 100);
      }
    }
  }, [silentRefresh]);

  const deleteFeedback = useCallback(async (feedbackId: string): Promise<DeleteResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    console.log('📥 deleteFeedback started:', feedbackId);
    setUpdateLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing updateLoading to false');
        setUpdateLoading(false);
      }
    }, 5000);

    try {
      const result = await AdminFeedbackService.deleteFeedback(feedbackId);
      
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('feedback-updated'));
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      return { success: false, message: errorMessage };
    } finally {
      clearTimeout(safetyTimeout);
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setUpdateLoading(false);
          }
        }, 100);
      }
    }
  }, [silentRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    feedback: feedbackData?.feedback || [],
    loading,
    error,
    stats: stats || null,
    pagination,
    fetchFeedback,
    fetchStats,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    refreshFeedback: silentRefresh,
    refreshStats: refreshStatsCache
  };
}