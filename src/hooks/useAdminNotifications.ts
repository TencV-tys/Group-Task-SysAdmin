// hooks/useAdminNotifications.ts - FIXED LOADING STATES
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
  // Single combined loading state
  const [loading, setLoading] = useState(true);
  
  // Local state for optimistic updates
  const [localUnreadCount, setLocalUnreadCount] = useState<number>(0);
  
  // Refs
  const isMountedRef = useRef(true);
  const fetchCountRef = useRef(0);
  const initialLoadDone = useRef(false);

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

  // Update loading state based on cache loading
  useEffect(() => {
    if (!initialLoadDone.current) {
      setLoading(cacheLoading);
      if (!cacheLoading) {
        initialLoadDone.current = true;
      }
    }
  }, [cacheLoading]);

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.count ?? localUnreadCount;
  const pagination = notificationsData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  };

  // Silent refresh function
  const silentRefresh = useCallback(async () => {
    console.log('🔄 Silent refresh started');
    
    try {
      await Promise.all([
        refreshNotificationsCache(),
        refreshUnreadCache()
      ]);
      console.log('✅ Silent refresh complete');
    } catch (error) {
      console.error('❌ Silent refresh failed:', error);
    }
  }, [refreshNotificationsCache, refreshUnreadCache]);

  // Fetch notifications with filters
  const fetchNotifications = useCallback(async (filters?: NotificationFilters): Promise<FetchNotificationsResult> => {
    const currentFetchId = ++fetchCountRef.current;
    console.log(`📥 fetchNotifications #${currentFetchId} started with filters:`, filters);
    
    // Only set loading true if this is the first fetch
    if (currentFetchId === 1) {
      setLoading(true);
    }
    
    try {
      const result = await AdminNotificationsService.getNotifications(filters);
      
      console.log(`📥 fetchNotifications #${currentFetchId} result:`, result);

      if (result.success && result.data) {
        // Trigger silent refresh in background
        setTimeout(() => {
          if (isMountedRef.current) {
            silentRefresh().catch(() => {});
          }
        }, 100);
        
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      return { success: false, message: errorMessage };
    } finally {
      console.log(`📥 fetchNotifications #${currentFetchId} finally block`);
      // Only set loading false if this is the last fetch
      if (currentFetchId === fetchCountRef.current) {
        setLoading(false);
      }
    }
  }, [silentRefresh]);

  // Fetch unread count
  const fetchUnreadCount = useCallback(async (): Promise<FetchUnreadResult> => {
    console.log('📥 fetchUnreadCount started');
    
    try {
      const result = await AdminNotificationsService.getUnreadCount();
      console.log('📥 fetchUnreadCount result:', result);

      if (result.success && result.data) {
        await refreshUnreadCache();
        return { success: true, count: result.data.count };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load count';
      return { success: false, message: errorMessage };
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
    console.log('📥 markAsRead started:', notificationId);
    
    // Optimistic update
    setLocalUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const result = await AdminNotificationsService.markAsRead(notificationId);

      if (result.success) {
        // Trigger silent refresh
        setTimeout(() => {
          if (isMountedRef.current) {
            silentRefresh().catch(() => {});
          }
        }, 100);
        window.dispatchEvent(new Event('notification-updated'));
        return { success: true, data: result.data };
      }
      // Revert on failure
      setLocalUnreadCount(prev => prev + 1);
      return { success: false, message: result.message };
    } catch (error) {
      setLocalUnreadCount(prev => prev + 1);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as read';
      return { success: false, message: errorMessage };
    }
  }, [silentRefresh]);

  // Mark all as read
  const markAllAsRead = useCallback(async (): Promise<MarkAllReadResult> => {
    const previousCount = unreadCount;
    setLocalUnreadCount(0);

    try {
      const result = await AdminNotificationsService.markAllAsRead();

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('notification-updated'));
        return { success: true, count: result.data?.count };
      }
      setLocalUnreadCount(previousCount);
      return { success: false, message: result.message };
    } catch (error) {
      setLocalUnreadCount(previousCount);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark all';
      return { success: false, message: errorMessage };
    }
  }, [unreadCount, silentRefresh]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string): Promise<DeleteResult> => {
    try {
      const result = await AdminNotificationsService.deleteNotification(notificationId);

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('notification-updated'));
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      return { success: false, message: errorMessage };
    }
  }, [silentRefresh]);

  // Delete all read
  const deleteAllRead = useCallback(async (): Promise<DeleteResult> => {
    try {
      const result = await AdminNotificationsService.deleteAllRead();

      if (result.success) {
        await silentRefresh();
        window.dispatchEvent(new Event('notification-updated'));
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      return { success: false, message: errorMessage };
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
    refreshNotifications: silentRefresh,
    refreshUnread: refreshUnreadCache
  };
}