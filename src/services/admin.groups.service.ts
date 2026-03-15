// services/admin.groups.service.ts - UPDATED
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ========== INTERFACES ==========

export interface GroupFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minMembers?: number;
  maxMembers?: number;
  createdAfter?: string;
  createdBefore?: string;
}

export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  inviteCode: string;
  createdAt: string;
  updatedAt: string;
  currentRotationWeek: number;
  lastRotationUpdate: string | null;
  _count?: {
    members: number;
    tasks: number;
    reports?: number;
  };
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export interface GroupsResponse {
  success: boolean;
  message: string;
  groups?: Group[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface GroupResponse {
  success: boolean;
  message: string;
  group?: Group;
}

export interface DeleteGroupResponse {
  success: boolean;
  message: string;
}

export interface GroupStatisticsResponse {
  success: boolean;
  message: string;
  statistics?: {
    overview: {
      total: number;
      withReports: number;
    };
  };
}

// Report Analysis Types
export interface ReportAnalysis {
  groupId: string;
  groupName: string;
  reportCount: number;
  reportTypes: {
    type: string;
    count: number;
    threshold: number;
    suggestedAction: string;
    severity: string;
    message: string;
    meetsThreshold: boolean;
  }[];
  suggestedActions: {
    action: string;
    reason: string;
    severity: string;
    reportTypes: string[];
  }[];
  requiresImmediateAction: boolean;
}

export interface ReportAnalysisResponse {
  success: boolean;
  message: string;
  analysis?: ReportAnalysis;
}

export interface ApplyActionResult {
  success: boolean;
  message: string;
}

export interface GroupWithAnalysis extends Group {
  reportAnalysis?: ReportAnalysis | null;
}

export interface GroupsWithAnalysisResponse {
  success: boolean;
  message: string;
  groups?: GroupWithAnalysis[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
}

// ========== SERVICE CLASS ==========

export class AdminGroupsService {
  
  /**
   * Get all groups with filters
   */
  static async getGroups(filters?: GroupFilters): Promise<GroupsResponse> {
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
      const url = `${API_URL}/api/admin/groups${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Get groups with report analysis
   */
  static async getGroupsWithAnalysis(filters?: GroupFilters): Promise<GroupsWithAnalysisResponse> {
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
      const url = `${API_URL}/api/admin/groups/with-analysis${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Get group by ID
   */
  static async getGroupById(groupId: string): Promise<GroupResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}`, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Delete a group (soft or hard delete)
   */
  static async deleteGroup(
    groupId: string, 
    options?: { hardDelete?: boolean; reason?: string }
  ): Promise<DeleteGroupResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hardDelete: options?.hardDelete,
          reason: options?.reason
        })
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Get group statistics
   */
  static async getGroupStatistics(): Promise<GroupStatisticsResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/statistics`, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Analyze group reports
   */
  static async analyzeGroupReports(groupId: string): Promise<ReportAnalysisResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/reports/analyze`, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Apply action to group (SUSPEND, RESTORE, SOFT_DELETE, HARD_DELETE, WARNING, REVIEW)
   */
  static async applyAction(
    groupId: string,
    action: string,
    reason?: string
  ): Promise<ApplyActionResult> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/apply-action`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, reason })
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }
}