// hooks/useAdminFeedback.ts - WITHOUT statsUpdateTrigger

import { useState, useCallback, useRef, useEffect } from 'react';
import { AdminFeedbackService } from '../services/admin.feedback.service';
import { adminSocket, connectAdminSocket } from '../services/adminSocket';
import type {
  Feedback,
  FeedbackFilters,
  FeedbackDetailsResponse,
  UpdateStatusResponse,
  DeleteResponse
} from '../services/admin.feedback.service';
 
export function useAdminFeedback() {
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalStats, setGlobalStats] = useState<any>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [actionLoading, setActionLoading] = useState(false);
  const [hasNewFeedback, setHasNewFeedback] = useState(false);
  const [filters, setFilters] = useState<FeedbackFilters>({ page: 1, limit: 10 });

  const isMountedRef = useRef(true);
  const initialLoadDoneRef = useRef(false);
  const isDeletingRef = useRef(false);
  const filtersRef = useRef<FeedbackFilters>({ page: 1, limit: 10 });

  const fetchSeqRef = useRef(0);
  const userSeqRef = useRef(0);
  const bgDebounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    isMountedRef.current = true;
    connectAdminSocket().catch(console.error);
    return () => {
      isMountedRef.current = false;
      if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);
    };
  }, []);

  // ─── fetchFeedback ──────────────────────────────────────────────────────────
  const fetchFeedback = useCallback(async (
    filterParams?: FeedbackFilters,
    showSpinner = false
  ) => {
    if (!isMountedRef.current) return { success: false, message: 'Unmounted' };

    const seq = ++fetchSeqRef.current;
    if (showSpinner) setLoading(true);
    setError(null);

    const finalFilters: FeedbackFilters = { ...filtersRef.current, ...filterParams };

    try {
      const result = await AdminFeedbackService.getFeedback(finalFilters);

      if (seq !== fetchSeqRef.current) return { success: false, message: 'Superseded' };
      if (!isMountedRef.current) return { success: false, message: 'Unmounted' };

      if (result.success && result.data) {
        setFeedback(result.data.feedback || []);
        setPagination({
          page: result.data.pagination.page,
          limit: result.data.pagination.limit,
          total: result.data.pagination.total,
          pages: result.data.pagination.pages,
        });
        setHasNewFeedback(false);
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to load feedback');
        return { success: false, message: result.message };
      }
    } catch (err) {
      if (seq !== fetchSeqRef.current) return { success: false, message: 'Superseded' };
      if (isMountedRef.current) {
        const msg = err instanceof Error ? err.message : 'Network error';
        setError(msg);
        return { success: false, message: msg };
      }
    } finally {
      if (isMountedRef.current && showSpinner) setLoading(false);
    }

    return { success: false, message: 'Unknown error' };
  }, []);

  // ─── fetchGlobalStats ───────────────────────────────────────────────────────
  const fetchGlobalStats = useCallback(async () => {
    if (!isMountedRef.current) return;
    
    try {
      const result = await AdminFeedbackService.getFeedbackStats();
      if (result.success && result.data && isMountedRef.current) {
        setGlobalStats({ ...result.data });
      }
    } catch (err) {
      console.error('[fetchGlobalStats]', err);
    }
  }, []);

  // ─── backgroundRefresh ──────────────────────────────────────────────────────
  const backgroundRefresh = useCallback(() => {
    if (!isMountedRef.current) return;

    if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);

    bgDebounceRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      fetchFeedback(undefined, false);
      fetchGlobalStats();
    }, 200);
  }, [fetchFeedback, fetchGlobalStats]);

  // ─── getFeedbackDetails ─────────────────────────────────────────────────────
  const getFeedbackDetails = useCallback(async (id: string): Promise<FeedbackDetailsResponse> => {
    try {
      return await AdminFeedbackService.getFeedbackById(id);
    } catch {
      return { success: false, message: 'Failed to fetch feedback details' };
    }
  }, []);

  // ─── updateStatus ───────────────────────────────────────────────────────────
  const updateStatus = useCallback(async (feedbackId: string, newStatus: string): Promise<UpdateStatusResponse> => {
    setActionLoading(true);

    const myUserSeq = ++userSeqRef.current;

    setFeedback(prev =>
      prev.map(f => f.id === feedbackId ? { ...f, status: newStatus } : f)
    );

    try {
      const result = await AdminFeedbackService.updateFeedbackStatus(feedbackId, newStatus);
      if (result.success && isMountedRef.current) {
        const activeStatusFilter = filtersRef.current.status;

        if (activeStatusFilter && activeStatusFilter !== newStatus) {
          setFeedback(prev => prev.filter(f => f.id !== feedbackId));
        }

        if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);

        if (myUserSeq === userSeqRef.current) {
          await Promise.all([
            fetchFeedback(undefined, false),
            fetchGlobalStats(),
          ]);
        }
      }
      return result;
    } catch (err) {
      console.error('[updateStatus]', err);
      await fetchFeedback(undefined, false);
      return { success: false, message: 'Failed to update status' };
    } finally {
      if (isMountedRef.current) setActionLoading(false);
    }
  }, [fetchFeedback, fetchGlobalStats]);

  // ─── deleteFeedback ─────────────────────────────────────────────────────────
  const deleteFeedback = useCallback(async (feedbackId: string): Promise<DeleteResponse> => {
    if (isDeletingRef.current) return { success: false, message: 'Delete already in progress' };
    isDeletingRef.current = true;
    setActionLoading(true);

    const myUserSeq = ++userSeqRef.current;

    setFeedback(prev => prev.filter(f => f.id !== feedbackId));

    if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);

    try {
      const result = await AdminFeedbackService.deleteFeedback(feedbackId);
      if (isMountedRef.current && myUserSeq === userSeqRef.current) {
        await Promise.all([
          fetchFeedback(undefined, false),
          fetchGlobalStats(),
        ]);
      }
      return result;
    } catch (err) {
      console.error('[deleteFeedback]', err);
      if (isMountedRef.current) fetchFeedback(undefined, false);
      return { success: false, message: 'Failed to delete feedback' };
    } finally {
      if (isMountedRef.current) setActionLoading(false);
      isDeletingRef.current = false;
    }
  }, [fetchFeedback, fetchGlobalStats]);

  // ─── updateFilters ──────────────────────────────────────────────────────────
  const updateFilters = useCallback((newFilters: FeedbackFilters) => {
    if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);
    ++userSeqRef.current;

    const merged: FeedbackFilters = { ...filtersRef.current, ...newFilters };
    filtersRef.current = merged;
    setFilters(merged);
    fetchFeedback(merged, true);
    fetchGlobalStats();
  }, [fetchFeedback, fetchGlobalStats]);

  // ─── refreshFeedback ────────────────────────────────────────────────────────
  const refreshFeedback = useCallback(async () => {
    if (bgDebounceRef.current) clearTimeout(bgDebounceRef.current);
    ++userSeqRef.current;
    await Promise.all([fetchFeedback(undefined, true), fetchGlobalStats()]);
  }, [fetchFeedback, fetchGlobalStats]);

  // ─── Socket listeners ───────────────────────────────────────────────────────
  useEffect(() => {
    const handleStatusChange = (data: any) => {
      if (!isMountedRef.current) return;
      console.log('[Socket] feedback:status received', data);
      if (data?.feedbackId && data?.newStatus) {
        setFeedback(prev =>
          prev.map(f => f.id === data.feedbackId ? { ...f, status: data.newStatus } : f)
        );
      }
      backgroundRefresh();
    };
 
    const handleNew = () => {
      if (!isMountedRef.current) return;
      console.log('[Socket] feedback:new received');
      setHasNewFeedback(true);
      backgroundRefresh();
    };

    const handleDeleted = (data: any) => {
      if (!isMountedRef.current) return;
      console.log('[Socket] feedback:deleted received', data);
      if (data?.feedbackId) {
        setFeedback(prev => prev.filter(f => f.id !== data.feedbackId));
      }
      backgroundRefresh();
    };

    const handleUpdated = () => {
      if (!isMountedRef.current) return;
      console.log('[Socket] feedback:updated received');
      backgroundRefresh();
    };

    adminSocket.on('feedback:status', handleStatusChange);
    adminSocket.on('feedback:new', handleNew);
    adminSocket.on('feedback:deleted', handleDeleted);
    adminSocket.on('feedback:updated', handleUpdated);

    return () => {
      adminSocket.off('feedback:status', handleStatusChange);
      adminSocket.off('feedback:new', handleNew);
      adminSocket.off('feedback:deleted', handleDeleted);
      adminSocket.off('feedback:updated', handleUpdated);
    };
  }, [backgroundRefresh]);

  // ─── Initial load - ONLY ONCE ───────────────────────────────────────────────
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      fetchFeedback({ page: 1, limit: 10 }, true);
      fetchGlobalStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    feedback,
    loading,
    error,
    globalStats,
    pagination,
    actionLoading,
    hasNewFeedback,
    currentFilters: filters,
    fetchFeedback,
    fetchGlobalStats,
    getFeedbackDetails,
    updateStatus,
    deleteFeedback,
    refreshFeedback,
    updateFilters,
  };
}