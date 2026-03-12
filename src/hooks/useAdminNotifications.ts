// hooks/useAdminNotifications.ts
import { useCallback, useState, useRef, useEffect } from 'react';
import { AdminNotificationsService } from '../services/admin.notifications.service';
import { useDataCache } from './useDataCache';
import type { 
  AdminNotification, 
  NotificationFilters,
  NotificationsResponse,
} from '../services/admin.notifications.service';

interface NotificationsCacheData {
  notifications: AdminNotification[];
  unreadCount: number;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface FetchNotificationsResult {
  success: boolean;
  data?: NotificationsResponse['data'];
  message?: string;
}

interface FetchUnreadResult {
  success: boolean;
  count?: number;
  message?: string;
}

interface FetchDetailsResult {
  success: boolean;
  data?: AdminNotification;
  message?: string;
}

interface MarkReadResult {
  success: boolean;
  data?: AdminNotification;
  message?: string;
}

interface MarkAllReadResult {
  success: boolean;
  count?: number;
  message?: string;
}

interface DeleteResult {
  success: boolean;
  message?: string;
  data?: { count?: number };
}

export function useAdminNotifications() {
  // Operation-specific loading states
  const [fetchLoading, setFetchLoading] = useState(false);
  const [markReadLoading, setMarkReadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Local state for optimistic updates
  const [localUnreadCount, setLocalUnreadCount] = useState<number>(0);
  
  // Refs
  const isMountedRef = useRef(true);
  const refreshInProgress = useRef(false);

  // Cache for notifications list
  const {
    data: notificationsData,
    loading: cacheLoading,
    error,
    refresh: refreshNotificationsCache
  } = useDataCache<NotificationsCacheData>(
    'admin-notifications',
    async () => {
      const result = await AdminNotificationsService.getNotifications({ limit: 10 });
      if (result.success && result.data) {
        return {
          notifications: result.data.notifications,
          unreadCount: result.data.unreadCount,
          pagination: result.data.pagination
        };
      }
      throw new Error(result.message || 'Failed to fetch notifications');
    },
    30 * 1000
  );

  // Cache for unread count
  const {
    data: unreadData,
    refresh: refreshUnreadCache
  } = useDataCache<{ count: number }>(
    'admin-notifications-unread',
    async () => {
      const result = await AdminNotificationsService.getUnreadCount();
      if (result.success && result.data) {
        return result.data;
      }
      throw new Error(result.message || 'Failed to fetch unread count');
    },
    30 * 1000
  );

  // Combined loading state
  const loading = cacheLoading || fetchLoading || markReadLoading || deleteLoading;
  
  // Debug logs
  console.log('🔧 useAdminNotifications loading states:', {
    cacheLoading,
    fetchLoading,
    markReadLoading,
    deleteLoading,
    combined: loading,
    hasNotifications: notificationsData?.notifications?.length || 0,
    notificationsData: notificationsData ? 'exists' : 'null'
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.count ?? localUnreadCount;
  const pagination = notificationsData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  };

  // Silent refresh function (doesn't affect fetchLoading)
  const silentRefresh = useCallback(async () => {
    if (refreshInProgress.current || !isMountedRef.current) return;
    
    refreshInProgress.current = true;
    console.log('🔄 Silent refresh started');
    
    try {
      await Promise.all([
        refreshNotificationsCache(),
        refreshUnreadCache()
      ]);
      console.log('✅ Silent refresh complete');
    } catch (error) {
      console.error('❌ Silent refresh failed:', error);
    } finally {
      refreshInProgress.current = false;
    }
  }, [refreshNotificationsCache, refreshUnreadCache]);

  // Fetch notifications with filters
  const fetchNotifications = useCallback(async (filters?: NotificationFilters): Promise<FetchNotificationsResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    console.log('📥 fetchNotifications started with filters:', filters);
    setFetchLoading(true);
    
    // Safety timeout to force reset loading state
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing fetchLoading to false');
        setFetchLoading(false);
      }
    }, 5000);
    
    try {
      const result = await AdminNotificationsService.getNotifications(filters);
      
      console.log('📥 fetchNotifications result:', result);
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success && result.data) {
        // Trigger silent refresh in background
        silentRefresh().catch(console.error);
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      return { success: false, message: errorMessage };
    } finally {
      console.log('📥 fetchNotifications finally block - setting fetchLoading to false');
      clearTimeout(safetyTimeout);
      
      if (isMountedRef.current) {
        // Use setTimeout to ensure this runs after any other state updates
        setTimeout(() => {
          if (isMountedRef.current) {
            setFetchLoading(false);
            console.log('✅ fetchLoading set to false');
          }
        }, 100);
      }
    }
  }, [silentRefresh]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async (): Promise<FetchUnreadResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    console.log('📥 fetchUnreadCount started');
    setFetchLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing fetchLoading to false');
        setFetchLoading(false);
      }
    }, 5000);
    
    try {
      const result = await AdminNotificationsService.getUnreadCount();
      
      console.log('📥 fetchUnreadCount result:', result);
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success && result.data) {
        await refreshUnreadCache();
        return { success: true, count: result.data.count };
      }
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load count';
      return { success: false, message: errorMessage };
    } finally {
      console.log('📥 fetchUnreadCount finally block - setting fetchLoading to false');
      clearTimeout(safetyTimeout);
      
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setFetchLoading(false);
          }
        }, 100);
      }
    }
  }, [refreshUnreadCache]);

  // Get notification details
  const getNotificationDetails = useCallback(async (notificationId: string): Promise<FetchDetailsResult> => {
    try {
      const result = await AdminNotificationsService.getNotificationById(notificationId);
      if (result.success && result.data) {
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load details';
      return { success: false, message: errorMessage };
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string): Promise<MarkReadResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    console.log('📥 markAsRead started:', notificationId);
    
    // Optimistic update
    setLocalUnreadCount(prev => Math.max(0, prev - 1));
    setMarkReadLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing markReadLoading to false');
        setMarkReadLoading(false);
      }
    }, 5000);

    try {
      const result = await AdminNotificationsService.markAsRead(notificationId);
      
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success) {
        // Trigger silent refresh
        silentRefresh().catch(console.error);
        window.dispatchEvent(new Event('notification-updated'));
        return { success: true, data: result.data };
      }
      // Revert on failure
      setLocalUnreadCount(prev => prev + 1);
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      setLocalUnreadCount(prev => prev + 1);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as read';
      return { success: false, message: errorMessage };
    } finally {
      clearTimeout(safetyTimeout);
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setMarkReadLoading(false);
            console.log('✅ markReadLoading set to false');
          }
        }, 100);
      }
    }
  }, [silentRefresh]);

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<MarkAllReadResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    const previousCount = unreadCount;
    setLocalUnreadCount(0);
    setMarkReadLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing markReadLoading to false');
        setMarkReadLoading(false);
      }
    }, 5000);

    try {
      const result = await AdminNotificationsService.markAllAsRead();
      
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('notification-updated'));
        return { success: true, count: result.data?.count };
      }
      setLocalUnreadCount(previousCount);
      return { success: false, message: result.message };
    } catch (error) {
      clearTimeout(safetyTimeout);
      setLocalUnreadCount(previousCount);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark all';
      return { success: false, message: errorMessage };
    } finally {
      clearTimeout(safetyTimeout);
      if (isMountedRef.current) {
        setTimeout(() => {
          if (isMountedRef.current) {
            setMarkReadLoading(false);
          }
        }, 100);
      }
    }
  }, [unreadCount, silentRefresh]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string): Promise<DeleteResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    setDeleteLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing deleteLoading to false');
        setDeleteLoading(false);
      }
    }, 5000);

    try {
      const result = await AdminNotificationsService.deleteNotification(notificationId);
      
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('notification-updated'));
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
            setDeleteLoading(false);
          }
        }, 100);
      }
    }
  }, [silentRefresh]);

  // Delete all read
  const deleteAllRead = useCallback(async (): Promise<DeleteResult> => {
    if (!isMountedRef.current) {
      return { success: false, message: 'Component unmounted' };
    }

    setDeleteLoading(true);
    
    const safetyTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        console.log('⚠️ Safety timeout - forcing deleteLoading to false');
        setDeleteLoading(false);
      }
    }, 5000);

    try {
      const result = await AdminNotificationsService.deleteAllRead();
      
      clearTimeout(safetyTimeout);
      
      if (!isMountedRef.current) {
        return { success: false, message: 'Component unmounted' };
      }

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('notification-updated'));
        return { success: true, data: result.data };
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
            setDeleteLoading(false);
          }
        }, 100);
      }
    }
  }, [silentRefresh]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    notifications,
    loading,
    error,
    unreadCount,
    pagination, 
    fetchNotifications,
    fetchUnreadCount,
    getNotificationDetails,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead, 
    refreshNotifications: silentRefresh, // Use silentRefresh instead of direct cache refresh
    refreshUnread: refreshUnreadCache
  };
}