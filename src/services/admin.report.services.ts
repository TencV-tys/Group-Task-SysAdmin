// services/admin.reports.service.ts - WITH AUTH HEADER
const API_URL = import.meta.env.VITE_API_URL;

// Helper to get token
const getToken = () => localStorage.getItem('adminAccessToken');

export interface Report {
  id: string;
  type: string;
  description: string;
  status: 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  reporter: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
  };
  group: {
    id: string;
    name: string;
    description: string | null;
    avatarUrl: string | null;
    _count: {
      members: number;
      tasks: number;
    };
  };
  resolver: {
    id: string;
    fullName: string;
    email: string;
  } | null;
}

export interface BulkDeleteResult {
  totalCount: number;
  successCount: number;
  failedIds: string[];
  deletedReports: Array<{
    id: string;
    status: string;
    deletedAt: string;
    deletedBy: string;
  }>;
}

export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  results?: BulkDeleteResult;
}

export interface ReportFilters {
  status?: string;
  page?: number;
  limit?: number;
  search?: string;
}

export interface ReportsResponse {
  success: boolean;
  message: string;
  reports?: Report[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ReportDetailsResponse {
  success: boolean;
  message: string;
  report?: Report;
}

export interface ReportStatistics {
  overview: {
    total: number;
    pending: number;
    reviewing: number;
    resolved: number;
    dismissed: number;
    resolutionRate: number;
  };
  byType: Array<{
    type: string;
    count: number;
  }>;
  topReportedGroups: Array<{
    groupId: string;
    groupName: string;
    reportCount: number;
  }>;
  recentReports: Array<{
    id: string;
    type: string;
    status: string;
    reporterName: string;
    groupName: string;
    createdAt: string;
  }>;
}

export interface ReportStatisticsResponse {
  success: boolean;
  message: string;
  statistics?: ReportStatistics;
}

export interface UpdateReportStatusResponse {
  success: boolean;
  message: string;
  report?: Report;
}

class AdminReportsServiceClass {
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const token = getToken();
    const headers: HeadersInit = {};
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    // ✅ ADD AUTHORIZATION HEADER
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    return headers;
  }

  // ========== GET ALL REPORTS ==========
  static async getReports(filters?: ReportFilters): Promise<ReportsResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.search) params.append('search', filters.search);

      const url = `${API_URL}/api/admin/reports${params.toString() ? `?${params}` : ''}`;
      
      console.log('📥 Fetching reports:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Reports response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching reports:', error);
      return {
        success: false,
        message: 'Failed to fetch reports'
      };
    }
  }

  // ========== GET SINGLE REPORT DETAILS ==========
  static async getReportById(reportId: string): Promise<ReportDetailsResponse> {
    try {
      console.log('📥 Fetching report details:', reportId);
      
      const response = await fetch(`${API_URL}/api/admin/reports/${reportId}`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Report details response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching report details:', error);
      return {
        success: false,
        message: 'Failed to fetch report details'
      };
    }
  }

  // ========== UPDATE REPORT STATUS ==========
  static async updateReportStatus(
    reportId: string, 
    status: string, 
    resolutionNotes?: string
  ): Promise<UpdateReportStatusResponse> {
    try {
      console.log('📤 Updating report status:', { reportId, status });
      
      const response = await fetch(`${API_URL}/api/admin/reports/${reportId}/status`, {
        method: 'PUT',
        credentials: 'include',
        headers: await this.getHeaders(true),
        body: JSON.stringify({ status, resolutionNotes })
      });

      const result = await response.json();
      console.log('📦 Update report response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error updating report:', error);
      return {
        success: false,
        message: 'Failed to update report'
      };
    }
  }

  // ========== GET REPORT STATISTICS ==========
  static async getReportStatistics(): Promise<ReportStatisticsResponse> {
    try {
      console.log('📥 Fetching report statistics');
      
      const response = await fetch(`${API_URL}/api/admin/reports/statistics`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Report statistics response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching report statistics:', error);
      return {
        success: false,
        message: 'Failed to fetch report statistics'
      };
    }
  }

  // ========== DELETE SINGLE REPORT ==========
  static async deleteReport(reportId: string, hardDelete: boolean = false): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🗑️ Deleting report:', reportId, 'hardDelete:', hardDelete);
      
      const response = await fetch(`${API_URL}/api/admin/reports/${reportId}?hardDelete=${hardDelete}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Delete report response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error deleting report:', error);
      return {
        success: false,
        message: 'Failed to delete report'
      };
    }
  }

  // ========== BULK DELETE REPORTS ==========
  static async bulkDeleteReports(reportIds: string[], hardDelete: boolean = false): Promise<BulkDeleteResponse> {
    try {
      console.log('🗑️ Bulk deleting reports:', reportIds.length, 'hardDelete:', hardDelete);
      
      const response = await fetch(`${API_URL}/api/admin/reports/bulk-delete`, {
        method: 'POST',
        credentials: 'include',
        headers: await this.getHeaders(true),
        body: JSON.stringify({ reportIds, hardDelete })
      });

      const result = await response.json();
      console.log('📦 Bulk delete response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error bulk deleting reports:', error);
      return {
        success: false,
        message: 'Failed to bulk delete reports'
      };
    }
  }
}

export const AdminReportsService = AdminReportsServiceClass;