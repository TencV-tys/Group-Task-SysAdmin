// services/admin.audit.service.ts - WITH DELETE METHOD

const API_URL = import.meta.env.VITE_API_URL;

export interface AuditLogFilters {
  adminId?: string;
  action?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
  search?: string;
}
 
export interface AuditLog { 
  id: string;
  action: string;
  adminId: string;
  targetUserId?: string;
  details?: Record<string, unknown> | null;
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

export interface AuditLogDetails {
  [key: string]: unknown;
  method?: string;
  path?: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  reason?: string;
  groupId?: string;
  groupName?: string;
  memberCount?: number;
  taskCount?: number;
  hardDelete?: boolean;
  groupIds?: string[];
  count?: number;
  results?: Array<{
    groupId: string;
    success: boolean;
    message: string;
  }>;
}

export interface AuditLogsResponse {
  success: boolean;
  message: string;
  logs?: AuditLog[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface AuditLogResponse {
  success: boolean;
  message: string;
  log?: AuditLog;
}

export interface AuditStatisticsResponse {
  success: boolean;
  message: string;
  statistics?: {
    total: number;
    byAction: Array<{
      action: string;
      count: number;
    }>;
    topAdmins: Array<{
      adminId: string;
      adminName: string;
      adminEmail: string;
      count: number;
    }>;
    recentActivity: Array<{
      id: string;
      action: string;
      adminId: string;
      adminName: string;
      adminEmail: string;
      targetUserId?: string;
      targetUserName?: string;
      targetUserEmail?: string;
      createdAt: string;
      ipAddress?: string;
      details?: AuditLogDetails;
    }>;
    dailyActivity?: Array<{
      date: string;
      count: number;
    }>;
  };
}

export interface AuditExportData {
  success: boolean;
  message: string;
  logs?: AuditLog[];
}

export interface DeleteAuditLogResponse {
  success: boolean;
  message: string;
}

export class AdminAuditService {
  // ========== GET AUDIT LOGS ==========
static async getLogs(filters?: AuditLogFilters): Promise<AuditLogsResponse> {
  try {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const queryString = params.toString();
    const url = `${API_URL}/api/admin/audit${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      credentials: 'include'
      // ✅ No custom headers
    });
    return await response.json();
  } catch {
    return { success: false, message: 'Network error' };
  }
}

  // ========== GET AUDIT LOG BY ID ==========
  static async getLogById(logId: string): Promise<AuditLogResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/audit/${logId}`, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

static async getStatistics(filters?: { 
  startDate?: string; 
  endDate?: string;
  _t?: string;
}): Promise<AuditStatisticsResponse> { 
  try {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    const queryString = params.toString();
    const url = `${API_URL}/api/admin/audit/statistics${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(url, {
      credentials: 'include'
      // ✅ Remove headers - they cause CORS issues
    });
    return await response.json();
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return { success: false, message: 'Network error' };
  }
}
  // ========== EXPORT AUDIT LOGS ==========
  static async exportLogs(
    format?: 'json' | 'csv', 
    filters?: AuditLogFilters
  ): Promise<string | AuditExportData> {
    try {
      const params = new URLSearchParams();
      
      if (format) params.append('format', format);
      
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      const queryString = params.toString();
      const url = `${API_URL}/api/admin/audit/export${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (format === 'csv') {
        return await response.text();
      }
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  // ========== CLEAN OLD LOGS (Admin only) ==========
  static async cleanOldLogs(daysToKeep?: number): Promise<{ success: boolean; message: string; deletedCount?: number }> {
    try {
      const params = new URLSearchParams();
      if (daysToKeep) params.append('daysToKeep', daysToKeep.toString());
      
      const url = `${API_URL}/api/admin/audit/clean${params.toString() ? `?${params}` : ''}`;
      
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

// ========== DELETE SINGLE AUDIT LOG ==========
static async deleteLog(logId: string): Promise<DeleteAuditLogResponse> {
  try {
    // ✅ Get admin ID from localStorage
    let adminId = '';
    if (typeof window !== 'undefined') {
      const adminStr = localStorage.getItem('admin');
      if (adminStr) {
        try {
          const admin = JSON.parse(adminStr);
          adminId = admin.id;
        } catch (e) {
          console.error('Failed to parse admin data',e);
        }
      }
    }
    
    const response = await fetch(`${API_URL}/api/admin/audit/${logId}`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ adminId }) // ✅ Send adminId in body
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error deleting audit log:', error);
    return { 
      success: false, 
      message: 'Network error while deleting audit log' 
    };
  }
}
}