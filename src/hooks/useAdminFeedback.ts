import { useState, useCallback } from 'react';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import type { Feedback, FeedbackFilters, FeedbackStats} from '../services/admin.feedback.service';

export function useAdminFeedback() {
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

  const fetchFeedback = useCallback(async (filters?: FeedbackFilters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminFeedbackService.getFeedback(filters);
      
      if (result.success && result.data) {
        setFeedback(result.data.feedback);
        setPagination(result.data.pagination);
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to load feedback');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const result = await AdminFeedbackService.getFeedbackStats();
      
      if (result.success && result.data) {
        setStats(result.data);
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load stats';
      return { success: false, message: errorMessage };
    }
  }, []);

  const getFeedbackDetails = useCallback(async (feedbackId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminFeedbackService.getFeedbackById(feedbackId);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to load feedback details');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load details';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = useCallback(async (feedbackId: string, status: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminFeedbackService.updateFeedbackStatus(feedbackId, status);
      
      if (result.success) {
        // Refresh the list
        await fetchFeedback({ page: pagination.page, limit: pagination.limit });
        await fetchStats();
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to update status');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, fetchFeedback, fetchStats]);

  // ========== REMOVED addReply ==========

  const deleteFeedback = useCallback(async (feedbackId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminFeedbackService.deleteFeedback(feedbackId);
      
      if (result.success) {
        // Refresh the list
        await fetchFeedback({ page: pagination.page, limit: pagination.limit });
        await fetchStats();
        return { success: true };
      } else {
        setError(result.message || 'Failed to delete feedback');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, fetchFeedback, fetchStats]);

  const reset = useCallback(() => {
    setFeedback([]);
    setError(null);
    setStats(null);
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0
    });
  }, []);

  return {
    feedback,
    loading,
    error,
    stats,
    pagination,
    fetchFeedback,
    fetchStats,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    reset
  };
}