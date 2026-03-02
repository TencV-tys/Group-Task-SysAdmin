import { useState, useCallback } from 'react';
import { AdminNotificationsService } from '../services/admin.notifications.service';
import type { AdminNotification, NotificationFilters } from '../services/admin.notifications.service';

export function useAdminNotifications() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchNotifications = useCallback(async (filters?: NotificationFilters) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminNotificationsService.getNotifications(filters);
      
      if (result.success && result.data) {
        setNotifications(result.data.notifications);
        setUnreadCount(result.data.unreadCount);
        setPagination(result.data.pagination);
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to load notifications');
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

  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await AdminNotificationsService.getUnreadCount();
      
      if (result.success && result.data) {
        setUnreadCount(result.data.count);
        return { success: true, count: result.data.count };
      }
      return { success: false, message: result.message };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load count';
      return { success: false, message: errorMessage };
    }
  }, []);

  const getNotificationDetails = useCallback(async (notificationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminNotificationsService.getNotificationById(notificationId);
      
      if (result.success && result.data) {
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to load notification');
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

  const markAsRead = useCallback(async (notificationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminNotificationsService.markAsRead(notificationId);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
        return { success: true, data: result.data };
      } else {
        setError(result.message || 'Failed to mark as read');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark as read';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminNotificationsService.markAllAsRead();
      
      if (result.success) {
        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
        return { success: true, count: result.data?.count };
      } else {
        setError(result.message || 'Failed to mark all as read');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to mark all';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminNotificationsService.deleteNotification(notificationId);
      
      if (result.success) {
        // Update local state
        const deletedNotification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        
        if (deletedNotification && !deletedNotification.read) {
          setUnreadCount(prev => Math.max(0, prev - 1));
        }
        
        return { success: true };
      } else {
        setError(result.message || 'Failed to delete notification');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [notifications]);

  const deleteAllRead = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await AdminNotificationsService.deleteAllRead();
      
      if (result.success) {
        // Remove all read notifications from local state
        setNotifications(prev => prev.filter(n => !n.read));
        return { success: true, count: result.data?.count };
      } else {
        setError(result.message || 'Failed to delete read notifications');
        return { success: false, message: result.message };
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setNotifications([]);
    setError(null);
    setUnreadCount(0);
    setPagination({
      page: 1,
      limit: 10,
      total: 0,
      pages: 0
    });
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
    reset
  };
}