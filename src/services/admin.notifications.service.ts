const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface NotificationData {
  [key: string]: string | number | boolean | null | undefined | NotificationData | NotificationData[];
}

export interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: NotificationData | null;
  read: boolean;
  priority: string;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationFilters {
  read?: boolean;
  priority?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface NotificationsResponse {
  success: boolean;
  message: string;
  data?: {
    notifications: AdminNotification[];
    unreadCount: number;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface NotificationResponse {
  success: boolean;
  message: string;
  data?: AdminNotification;
}

export interface UnreadCountResponse {
  success: boolean;
  message: string;
  data?: {
    count: number;
  };
}

export interface BulkActionResponse {
  success: boolean;
  message: string;
  data?: {
    count: number;
  };
}

class AdminNotificationsServiceClass {
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {};
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // ========== GET ALL NOTIFICATIONS ==========
  static async getNotifications(filters?: NotificationFilters): Promise<NotificationsResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.read !== undefined) params.append('read', filters.read.toString());
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_URL}/api/admin/notifications${params.toString() ? `?${params}` : ''}`;
      
      console.log('📥 Fetching admin notifications:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Notifications response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      return {
        success: false,
        message: 'Failed to fetch notifications'
      };
    }
  }

  // ========== GET UNREAD COUNT ==========
  static async getUnreadCount(): Promise<UnreadCountResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/unread-count`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Unread count response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching unread count:', error);
      return {
        success: false,
        message: 'Failed to fetch unread count'
      };
    }
  }

  // ========== GET SINGLE NOTIFICATION ==========
  static async getNotificationById(notificationId: string): Promise<NotificationResponse> {
    try {
      console.log('📥 Fetching notification:', notificationId);
      
      const response = await fetch(`${API_URL}/api/admin/notifications/${notificationId}`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Notification details:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching notification:', error);
      return {
        success: false,
        message: 'Failed to fetch notification'
      };
    }
  }

  // ========== MARK AS READ ==========
  static async markAsRead(notificationId: string): Promise<NotificationResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Mark as read response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error marking as read:', error);
      return {
        success: false,
        message: 'Failed to mark as read'
      };
    }
  }

  // ========== MARK ALL AS READ ==========
  static async markAllAsRead(): Promise<BulkActionResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/mark-all-read`, {
        method: 'POST',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Mark all as read response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      return {
        success: false,
        message: 'Failed to mark all as read'
      };
    }
  }

  // ========== DELETE NOTIFICATION ==========
  static async deleteNotification(notificationId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Delete notification response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error deleting notification:', error);
      return {
        success: false,
        message: 'Failed to delete notification'
      };
    }
  }

  // ========== DELETE ALL READ ==========
  static async deleteAllRead(): Promise<BulkActionResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/notifications/read/all`, {
        method: 'DELETE',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Delete all read response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error deleting all read:', error);
      return {
        success: false,
        message: 'Failed to delete read notifications'
      };
    }
  }
}

export const AdminNotificationsService = AdminNotificationsServiceClass;