// services/admin.dashboard.service.ts
const API_URL = import.meta.env.VITE_API_URL;

export interface DashboardStats {
  users: {
    total: number;
    newToday: number;
    newThisWeek: number;
    active: number;
    suspended: number;
  };
  groups: {
    total: number;
    active: number;
    totalMembers: number;
    groupsWithReports: number;
  };
  feedback: {
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
  };
  reports: {
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
  };
  notifications: {
    unread: number;
    total: number;
  };
  admins: {
    systemAdmins: number;
    groupAdmins: number;
  };
  auditLogs: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    adminName: string;
    targetType?: string;
    targetName?: string;
    createdAt: string;
  }>;
}

export interface DashboardResponse {
  success: boolean;
  message: string;
  data?: DashboardStats;
}

// 👇 FIXED: No more 'any' type
export interface ActivityLog {
  id: string;
  action: string;
  adminId: string;
  targetUserId?: string;
  details?: Record<string, unknown> | null; // 👈 CHANGED FROM 'any'
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  admin?: {
    id: string;
    fullName: string;
    email: string;
  };
  targetUser?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string;
  };
}

export interface ActivityResponse {
  success: boolean;
  message: string;
  logs?: ActivityLog[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class AdminDashboardServiceClass {
  private static async getHeaders(): Promise<HeadersInit> {
    return {
      'Content-Type': 'application/json',
    };
  }

  // ========== GET DASHBOARD STATS ==========
  static async getStats(): Promise<DashboardResponse> {
    try {
      console.log('📥 Fetching dashboard stats...');
      
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Dashboard stats response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error);
      return {
        success: false,
        message: 'Failed to fetch dashboard stats'
      };
    }
  }

  // ========== GET RECENT ACTIVITY ==========
  static async getRecentActivity(limit: number = 10): Promise<ActivityResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/audit?limit=${limit}`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      return await response.json();

    } catch (error) {
      console.error('❌ Error fetching recent activity:', error);
      return {
        success: false,
        message: 'Failed to fetch recent activity'
      };
    }
  }
}

export const AdminDashboardService = AdminDashboardServiceClass;