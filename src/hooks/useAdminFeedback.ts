// hooks/useAdminFeedback.ts
import { useCallback, useState } from 'react';
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
  // 🔥 Add local loading states for operations
  const [fetchLoading, setFetchLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);

  // Cache for feedback list
  const {
    data: feedbackData,
    loading: initialLoading,
    error: cacheError,
    refresh: refreshFeedback
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

  // Cache for stats
  const {
    data: stats,
    refresh: refreshStats
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

  const pagination = feedbackData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  };

  // 🔥 Combined loading state
  const loading = initialLoading || fetchLoading || statsLoading || updateLoading;
  const error = cacheError;

  const fetchFeedback = useCallback(async (filters?: FeedbackFilters): Promise<FetchFeedbackResult> => {
    setFetchLoading(true);
    try {
      const result = await AdminFeedbackService.getFeedback(filters);
      if (result.success && result.data) {
        // Update the cache with new data
        if (result.data) {
          // Manually update the cache or refresh
          await refreshFeedback();
        }
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch feedback';
      return { success: false, message: errorMessage };
    } finally {
      setFetchLoading(false);
    }
  }, [refreshFeedback]);

  const fetchStats = useCallback(async (): Promise<FetchStatsResult> => {
    setStatsLoading(true);
    try {
      const result = await AdminFeedbackService.getFeedbackStats();
      if (result.success && result.data) {
        await refreshStats();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stats';
      return { success: false, message: errorMessage };
    } finally {
      setStatsLoading(false);
    }
  }, [refreshStats]);

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
    setUpdateLoading(true);
    try {
      const result = await AdminFeedbackService.updateFeedbackStatus(feedbackId, status);
      if (result.success) {
        await Promise.all([refreshFeedback(), refreshStats()]);
        
        // 🔥 Dispatch event for sidebar to update
        window.dispatchEvent(new Event('feedback-updated'));
        
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update';
      return { success: false, message: errorMessage };
    } finally {
      setUpdateLoading(false);
    }
  }, [refreshFeedback, refreshStats]);

  const deleteFeedback = useCallback(async (feedbackId: string): Promise<DeleteResult> => {
    setUpdateLoading(true);
    try {
      const result = await AdminFeedbackService.deleteFeedback(feedbackId);
      if (result.success) {
        await Promise.all([refreshFeedback(), refreshStats()]);
        
        // 🔥 Dispatch event for sidebar to update
        window.dispatchEvent(new Event('feedback-updated'));
        
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      return { success: false, message: errorMessage };
    } finally {
      setUpdateLoading(false);
    }
  }, [refreshFeedback, refreshStats]);

  return {
    feedback: feedbackData?.feedback || [],
    loading,  // Now this combines all loading states
    error,
    stats: stats || null,
    pagination,
    fetchFeedback,
    fetchStats,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    refreshFeedback,
    refreshStats
  };
}