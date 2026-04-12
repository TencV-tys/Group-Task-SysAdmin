import { useCallback, useState, useEffect, useRef } from 'react';
import { AdminNotificationsService } from '../services/admin.notifications.service';
import type { 
  AdminNotification, 
  NotificationFilters,
} from '../services/admin.notifications.service';

export function useAdminNotifications() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [currentFilters, setCurrentFilters] = useState<NotificationFilters>({ 
    page: 1, 
    limit: 10 
  });

  // Refs to track initial load
  const initialLoadDoneRef = useRef(false);

  // Fetch notifications function
  const fetchNotifications = useCallback(async (filters: NotificationFilters) => {
    console.log('📥 Fetching notifications with filters:', filters);
    
    setLoading(true);
    try {
      const result = await AdminNotificationsService.getNotifications(filters);
      
      if (result.success && result.data) {
        setNotifications(result.data.notifications);
        setPagination(result.data.pagination);
        setUnreadCount(result.data.unreadCount);
        setError(null);
      } else {
        setError(result.message || 'Failed to fetch notifications');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch unread count separately
  const fetchUnreadCount = useCallback(async () => {
    try {
      const result = await AdminNotificationsService.getUnreadCount();
      if (result.success && result.data) {
        setUnreadCount(result.data.count);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
    }
  }, []);

  // Mark as read
  const markAsRead = useCallback(async (notificationId: string) => {
    console.log('📥 markAsRead:', notificationId);
    
    // Optimistic update
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    try {
      const result = await AdminNotificationsService.markAsRead(notificationId);
      
      if (!result.success) {
        // Revert on failure
        await fetchNotifications(currentFilters);
        await fetchUnreadCount();
      }
    } catch (error) {
         console.error('❌ Failed to mark as read:', error);
      // Revert on error
      await fetchNotifications(currentFilters);
      await fetchUnreadCount();
    }
  }, [currentFilters, fetchNotifications, fetchUnreadCount]);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    const previousUnreadCount = unreadCount;
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

    try {
      const result = await AdminNotificationsService.markAllAsRead();
      
      if (!result.success) {
        await fetchNotifications(currentFilters);
        await fetchUnreadCount();
      }
    } catch (error) {
         console.error('❌ Failed to mark as read:', error);
      setUnreadCount(previousUnreadCount);
      await fetchNotifications(currentFilters);
      await fetchUnreadCount();
    }
  }, [unreadCount, currentFilters, fetchNotifications, fetchUnreadCount]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    // Optimistic update
    const deletedNotification = notifications.find(n => n.id === notificationId);
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    
    if (deletedNotification && !deletedNotification.read) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    try {
      const result = await AdminNotificationsService.deleteNotification(notificationId);
      
      if (!result.success) {
        await fetchNotifications(currentFilters);
        await fetchUnreadCount();
      }
    } catch (error) {
         console.error('❌ Failed to mark as read:', error);
      await fetchNotifications(currentFilters);
      await fetchUnreadCount();
    }
  }, [notifications, currentFilters, fetchNotifications, fetchUnreadCount]);

  // Delete all read
  const deleteAllRead = useCallback(async () => {
    setNotifications(prev => prev.filter(n => !n.read));

    try {
      const result = await AdminNotificationsService.deleteAllRead();
      
      if (!result.success) {
        await fetchNotifications(currentFilters);
        await fetchUnreadCount();
      }
    } catch (error) {
         console.error('❌ Failed to mark as read:', error);
      await fetchNotifications(currentFilters);
      await fetchUnreadCount();
    }
  }, [currentFilters, fetchNotifications, fetchUnreadCount]);

  // Refresh function
  const refreshNotifications = useCallback(() => {
    return fetchNotifications(currentFilters);
  }, [fetchNotifications, currentFilters]);

  // Update filters and refetch
  const updateFilters = useCallback((filters: NotificationFilters) => {
    console.log('🔄 Updating filters:', filters);
    setCurrentFilters(prev => {
      const newFilters = { ...prev, ...filters };
      // Fetch immediately with new filters
      fetchNotifications(newFilters);
      fetchUnreadCount();
      return newFilters;
    });
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial load - only run once
  useEffect(() => {
    if (!initialLoadDoneRef.current) {
      initialLoadDoneRef.current = true;
      fetchNotifications(currentFilters);
      fetchUnreadCount();
    }
  }, [currentFilters, fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    loading,
    error, // Keep error in return even if not used in component (it might be used)
    unreadCount,
    pagination,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refreshNotifications,
    updateFilters,
    currentFilters
  };
}