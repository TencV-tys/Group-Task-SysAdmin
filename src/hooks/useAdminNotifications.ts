// hooks/useAdminNotifications.ts
import { useCallback, useState } from 'react';
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
  // 🔥 Add operation-specific loading states
  const [fetchLoading, setFetchLoading] = useState(false);
  const [markReadLoading, setMarkReadLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // Local state for optimistic updates
  const [localUnreadCount, setLocalUnreadCount] = useState<number>(0);

  // Cache for notifications list
  const {
    data: notificationsData,
    loading: initialLoading,
    error,
    refresh: refreshNotifications
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
    refresh: refreshUnread
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

  // 🔥 Combined loading state
  const loading = initialLoading || fetchLoading || markReadLoading || deleteLoading;

  const notifications = notificationsData?.notifications || [];
  const unreadCount = unreadData?.count ?? localUnreadCount;
  const pagination = notificationsData?.pagination || {
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  };

  const fetchNotifications = useCallback(async (filters?: NotificationFilters): Promise<FetchNotificationsResult> => {
    setFetchLoading(true);
    try {
      const result = await AdminNotificationsService.getNotifications(filters);
      if (result.success && result.data) {
        await refreshNotifications();
        await refreshUnread();
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      return { success: false, message: errorMessage };
    } finally {
      setFetchLoading(false);
    }
  }, [refreshNotifications, refreshUnread]);

  const fetchUnreadCount = useCallback(async (): Promise<FetchUnreadResult> => {
    setFetchLoading(true);
    try {
      const result = await AdminNotificationsService.getUnreadCount();
      if (result.success && result.data) {
        await refreshUnread();
        return { success: true, count: result.data.count };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load count';
      return { success: false, message: errorMessage };
    } finally {
      setFetchLoading(false);
    }
  }, [refreshUnread]);

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

  const markAsRead = useCallback(async (notificationId: string): Promise<MarkReadResult> => {
    // Optimistic update
    setLocalUnreadCount(prev => Math.max(0, prev - 1));
    setMarkReadLoading(true);

    try {
      const result = await AdminNotificationsService.markAsRead(notificationId);
      if (result.success) {
        await Promise.all([refreshNotifications(), refreshUnread()]);
        
        // 🔥 Dispatch event for sidebar to update
        window.dispatchEvent(new Event('notification-updated'));
        
        return { success: true, data: result.data };
      }
      // Revert on failure
      setLocalUnreadCount(prev => prev + 1);
      return { success: false, message: result.message };
    } catch (error) {
      // Revert on error
      setLocalUnreadCount(prev => prev + 1);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as read';
      return { success: false, message: errorMessage };
    } finally {
      setMarkReadLoading(false);
    }
  }, [refreshNotifications, refreshUnread]);

  const markAllAsRead = useCallback(async (): Promise<MarkAllReadResult> => {
    const previousCount = unreadCount;
    setLocalUnreadCount(0);
    setMarkReadLoading(true);

    try {
      const result = await AdminNotificationsService.markAllAsRead();
      if (result.success) {
        await Promise.all([refreshNotifications(), refreshUnread()]);
        
        // 🔥 Dispatch event for sidebar to update
        window.dispatchEvent(new Event('notification-updated'));
        
        return { success: true, count: result.data?.count };
      }
      setLocalUnreadCount(previousCount);
      return { success: false, message: result.message };
    } catch (error) {
      setLocalUnreadCount(previousCount);
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark all';
      return { success: false, message: errorMessage };
    } finally {
      setMarkReadLoading(false);
    }
  }, [unreadCount, refreshNotifications, refreshUnread]);

  const deleteNotification = useCallback(async (notificationId: string): Promise<DeleteResult> => {
    setDeleteLoading(true);
    try {
      const result = await AdminNotificationsService.deleteNotification(notificationId);
      if (result.success) {
        await Promise.all([refreshNotifications(), refreshUnread()]);
        
        // 🔥 Dispatch event for sidebar to update
        window.dispatchEvent(new Event('notification-updated'));
        
        return { success: true };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      return { success: false, message: errorMessage };
    } finally {
      setDeleteLoading(false);
    }
  }, [refreshNotifications, refreshUnread]);

  const deleteAllRead = useCallback(async (): Promise<DeleteResult> => {
    setDeleteLoading(true);
    try {
      const result = await AdminNotificationsService.deleteAllRead();
      if (result.success) {
        await Promise.all([refreshNotifications(), refreshUnread()]);
        
        // 🔥 Dispatch event for sidebar to update
        window.dispatchEvent(new Event('notification-updated'));
        
        return { success: true, data: result.data };
      }
      return { success: false, message: result.message };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      return { success: false, message: errorMessage };
    } finally {
      setDeleteLoading(false);
    }
  }, [refreshNotifications, refreshUnread]);

  return {
    notifications,
    loading, // 🔥 Now includes all operation states
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
    refreshNotifications,
    refreshUnread
  };
}