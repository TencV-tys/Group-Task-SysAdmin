// hooks/useAdminNotifications.ts - FIXED socket handlers

import { useCallback, useState, useEffect, useRef } from 'react';
import { AdminNotificationsService } from '../services/admin.notifications.service';
import { adminSocket } from '../services/adminSocket';
import type { AdminNotification, NotificationFilters } from '../services/admin.notifications.service';

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
  const [hasNewNotification, setHasNewNotification] = useState(false);

  const initialLoadDoneRef = useRef(false);
  const tokenRef = useRef<string | null>(null);

  // Get token from localStorage
  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      tokenRef.current = token;
      adminSocket.connect(token);
    }
  }, []);

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
        setHasNewNotification(false);
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

  // ========== REAL-TIME SOCKET LISTENERS ==========
  useEffect(() => {
    // ✅ FIXED: Properly typed handlers that match EventCallback signature
    const handleNewNotification = (...args: unknown[]) => {
      const notification = args[0] as AdminNotification;
      console.log('📢 Real-time: New admin notification', notification);
      
      // Add to notifications list
      setNotifications(prev => [notification, ...prev]);
      
      if (!notification.read) {
        setUnreadCount(prev => prev + 1);
        setHasNewNotification(true);
      }
      
      // Update pagination total
      setPagination(prev => ({
        ...prev,
        total: prev.total + 1,
        pages: Math.ceil((prev.total + 1) / prev.limit)
      }));
      
      // Show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    };
    
    const handleNotificationStatusChanged = (...args: unknown[]) => {
      const data = args[0] as { notificationId: string; read: boolean };
      console.log('📢 Real-time: Notification status changed', data);
      
      setNotifications(prev => prev.map(n => 
        n.id === data.notificationId ? { ...n, read: data.read } : n
      ));
      
      if (data.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setUnreadCount(prev => prev + 1);
      }
    };
    
    const handleNotificationDeleted = (...args: unknown[]) => {
      const data = args[0] as { notificationId: string };
      console.log('📢 Real-time: Notification deleted', data);
      
      setNotifications(prev => prev.filter(n => n.id !== data.notificationId));
      setPagination(prev => ({
        ...prev,
        total: Math.max(0, prev.total - 1),
        pages: Math.ceil(Math.max(0, prev.total - 1) / prev.limit)
      }));
    };
    
    // Register listeners
    adminSocket.on('admin:notification:new', handleNewNotification);
    adminSocket.on('admin:notification:status', handleNotificationStatusChanged);
    adminSocket.on('admin:notification:deleted', handleNotificationDeleted);
    
    return () => {
      adminSocket.off('admin:notification:new', handleNewNotification);
      adminSocket.off('admin:notification:status', handleNotificationStatusChanged);
      adminSocket.off('admin:notification:deleted', handleNotificationDeleted);
    };
  }, []);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
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
        await fetchNotifications(currentFilters);
        await fetchUnreadCount();
      }
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
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
      console.error('❌ Failed to mark all as read:', error);
      setUnreadCount(previousUnreadCount);
      await fetchNotifications(currentFilters);
      await fetchUnreadCount();
    }
  }, [unreadCount, currentFilters, fetchNotifications, fetchUnreadCount]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
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
      console.error('❌ Failed to delete notification:', error);
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
      console.error('❌ Failed to delete all read:', error);
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
      fetchNotifications(newFilters);
      fetchUnreadCount();
      return newFilters;
    });
  }, [fetchNotifications, fetchUnreadCount]);

  // Initial load
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
    error,
    unreadCount,
    pagination,
    hasNewNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    refreshNotifications,
    updateFilters,
    currentFilters
  };
}