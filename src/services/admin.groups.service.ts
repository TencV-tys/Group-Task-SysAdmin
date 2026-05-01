// services/admin.groups.service.ts - WITH AUTH HEADER
const API_URL = import.meta.env.VITE_API_URL;

// Helper to get token
const getToken = () => localStorage.getItem('adminAccessToken');

// ========== CONSTANTS (Replace Enums) ==========
export const GroupStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DELETED: 'DELETED'
} as const;

export type GroupStatus = typeof GroupStatus[keyof typeof GroupStatus];

export const ReportType = {
  INAPPROPRIATE_CONTENT: 'INAPPROPRIATE_CONTENT',
  HARASSMENT: 'HARASSMENT',
  SPAM: 'SPAM',
  OFFENSIVE_BEHAVIOR: 'OFFENSIVE_BEHAVIOR',
  TASK_ABUSE: 'TASK_ABUSE',
  GROUP_MISUSE: 'GROUP_MISUSE',
  OTHER: 'OTHER'
} as const;

export type ReportType = typeof ReportType[keyof typeof ReportType];

export const ActionType = {
  SUSPEND: 'SUSPEND',
  SOFT_DELETE: 'SOFT_DELETE',
  HARD_DELETE: 'HARD_DELETE',
  RESTORE: 'RESTORE',
  REVIEW: 'REVIEW'
} as const;

export type ActionType = typeof ActionType[keyof typeof ActionType];

// ========== ACTION BUTTON CONFIG ==========
export const ACTION_BUTTONS: Record<ActionType, {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  hoverColor: string;
  description: string;
}> = {
  SUSPEND: {
    label: 'Suspend Group',
    icon: '⚠️',
    color: '#e67700',
    bgColor: '#fff3bf',
    borderColor: '#ffd43b',
    hoverColor: '#ffd43b',
    description: 'Temporarily disable group activity'
  },
  SOFT_DELETE: {
    label: 'Soft Delete',
    icon: '🗑️',
    color: '#e67700',
    bgColor: '#fff3bf',
    borderColor: '#ffd43b',
    hoverColor: '#ffd43b',
    description: 'Archive group - can be restored later'
  },
  HARD_DELETE: {
    label: 'Hard Delete',
    icon: '❌',
    color: '#fa5252',
    bgColor: '#ffe3e3',
    borderColor: '#ffc9c9',
    hoverColor: '#fa5252',
    description: 'Permanently delete group - cannot be undone'
  },
  RESTORE: {
    label: 'Restore Group',
    icon: '↩️',
    color: '#2b8a3e',
    bgColor: '#d3f9d8',
    borderColor: '#b2f2bb',
    hoverColor: '#2b8a3e',
    description: 'Restore a previously deleted group'
  },
  REVIEW: {
    label: 'Mark for Review',
    icon: '👀',
    color: '#1c7ed6',
    bgColor: '#d0ebff',
    borderColor: '#a5d8ff',
    hoverColor: '#1c7ed6',
    description: 'Flag group for admin review'
  }
};

// ========== FILTERS INTERFACE ==========
export interface GroupFilters {
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minMembers?: 6;
  maxMembers?: 6 | 7 | 8 | 9 | 10;
  createdAfter?: string;
  createdBefore?: string;
  status?: GroupStatus;
  hasReports?: boolean;
  minReports?: number;
}

// ========== GROUP INTERFACE ==========
export interface Group {
  id: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  inviteCode: string;
  status: GroupStatus;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  currentRotationWeek: number;
  lastRotationUpdate: string | null;
  creator?: {
    id: string;
    fullName: string;
    email: string;
  };
  _count?: {
    members: number;
    tasks: number;
    reports: number;
  };
}

// ========== REPORT ANALYSIS INTERFACES ==========
export interface ReportTypeInfo {
  type: ReportType;
  count: number;
  threshold: number;
  meetsThreshold: boolean;
}

export interface AvailableAction {
  action: ActionType;
  reason: string;
  severity: string;
  canExecute: boolean;
  reportTypes: ReportType[];
  thresholdMet: boolean;
}

export interface ReportAnalysis {
  groupId: string;
  groupName: string;
  groupStatus: GroupStatus;
  isDeleted: boolean;
  reportCount: number;
  reportTypes: ReportTypeInfo[];
  availableActions: AvailableAction[];
  requiresImmediateAction: boolean;
}

// ========== RESPONSE INTERFACES ==========
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
  group?: Group & {
    stats?: {
      totalTasks: number;
      completedTasks: number;
      completionRate: number;
    };
    members?: Array<{
      id: string;
      userId: string;
      groupRole: string;
      joinedAt: string;
      user: {
        id: string;
        fullName: string;
        email: string;
        avatarUrl?: string;
        roleStatus: string;
      };
    }>;
  };
}

export interface GroupsWithAnalysisResponse {
  success: boolean;
  message: string;
  groups?: (Group & { reportAnalysis?: ReportAnalysis | null })[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface ReportAnalysisResponse {
  success: boolean;
  message: string;
  analysis?: ReportAnalysis;
}

export interface ApplyActionResult {
  success: boolean;
  message: string;
  data?: {
    id: string;
    name: string;
    inviteCode: string;
    restoredTasks?: number;
  };
}

export interface GroupStatisticsResponse {
  success: boolean;
  message: string;
  statistics?: {
    overview: {
      total: number;
      withReports: number;
      active: number;
      suspended: number;
      deleted: number;
    };
    byMemberCount: {
      exactly_6: number;
      exactly_7: number;
      exactly_8: number;
      exactly_9: number;
      exactly_10: number;
    };
  };
}

export interface DeleteGroupResponse {
  success: boolean;
  message: string;
}

// ========== HELPER FOR HEADERS ==========
const getHeaders = async (withJsonContent: boolean = true): Promise<HeadersInit> => {
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
};

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
          if (value !== undefined && value !== '' && value !== null) {
            params.append(key, value.toString());
          }
        });
      }
      
      const queryString = params.toString();
      const url = `${API_URL}/api/admin/groups${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: await getHeaders(false)
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching groups:', error);
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
          if (value !== undefined && value !== '' && value !== null) {
            params.append(key, value.toString());
          }
        });
      }
      
      const queryString = params.toString();
      const url = `${API_URL}/api/admin/groups/with-analysis${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include',
        headers: await getHeaders(false)
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          return { 
            success: false, 
            message: 'Rate limit exceeded. Please wait a moment and try again.' 
          };
        }
        return { 
          success: false, 
          message: `Server error: ${response.status}` 
        };
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching groups with analysis:', error);
      return { 
        success: false, 
        message: 'Network error - possible CORS or rate limit issue' 
      };
    }
  }

  /**
   * Get group by ID with full details
   */
  static async getGroupById(groupId: string): Promise<GroupResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}`, {
        credentials: 'include',
        headers: await getHeaders(false)
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching group:', error);
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
        headers: await getHeaders(true),
        body: JSON.stringify({
          hardDelete: options?.hardDelete,
          reason: options?.reason
        })
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting group:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Get group statistics with member count breakdown
   */
  static async getGroupStatistics(): Promise<GroupStatisticsResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/statistics`, {
        credentials: 'include',
        headers: await getHeaders(false)
      });
      return await response.json();
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Analyze group reports to see available actions
   */
  static analyzeGroupReportsCache = new Map<string, Promise<ReportAnalysisResponse>>();

  static async analyzeGroupReports(groupId: string): Promise<ReportAnalysisResponse> {
    if (this.analyzeGroupReportsCache.has(groupId)) {
      console.log('📦 [API] Reusing pending analysis request for:', groupId);
      return this.analyzeGroupReportsCache.get(groupId)!;
    }
    
    const promise = (async () => {
      try {
        const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/reports/analyze`, {
          credentials: 'include',
          headers: await getHeaders(false)
        });
        const data = await response.json();
        
        if (data.success) {
          setTimeout(() => {
            this.analyzeGroupReportsCache.delete(groupId);
          }, 30000);
        }
        
        return data;
      } catch (error) {
        console.error('Error analyzing reports:', error);
        return { success: false, message: 'Network error' };
      } finally {
        setTimeout(() => {
          this.analyzeGroupReportsCache.delete(groupId);
        }, 2000);
      }
    })();
    
    this.analyzeGroupReportsCache.set(groupId, promise);
    return promise;
  }

  /**
   * Apply action to group (SUSPEND, SOFT_DELETE, HARD_DELETE, RESTORE, REVIEW)
   */
  static async applyAction(
    groupId: string,
    action: ActionType,
    reason?: string
  ): Promise<ApplyActionResult> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/apply-action`, {
        method: 'POST',
        credentials: 'include',
        headers: await getHeaders(true),
        body: JSON.stringify({ action, reason })
      });
      return await response.json();
    } catch (error) {
      console.error('Error applying action:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // ========== HELPER METHODS ==========

  /**
   * Check if group is deleted (soft deleted)
   */
  static isGroupDeleted(group: Group): boolean {
    return group.isDeleted || group.status === GroupStatus.DELETED;
  }

  /**
   * Check if group is suspended
   */
  static isGroupSuspended(group: Group): boolean {
    return group.status === GroupStatus.SUSPENDED;
  }

  /**
   * Check if group is active
   */
  static isGroupActive(group: Group): boolean {
    return group.status === GroupStatus.ACTIVE && !group.isDeleted;
  }

  /**
   * Get available actions from analysis
   */
  static getAvailableActions(analysis: ReportAnalysis | null | undefined): AvailableAction[] {
    return analysis?.availableActions || [];
  }

  /**
   * Check if a specific action can be executed
   */
  static canExecuteAction(analysis: ReportAnalysis | null | undefined, action: ActionType): boolean {
    return analysis?.availableActions.some(a => a.action === action && a.canExecute) || false;
  }

  /**
   * Get action reason from analysis
   */
  static getActionReason(analysis: ReportAnalysis | null | undefined, action: ActionType): string | null {
    const availableAction = analysis?.availableActions.find(a => a.action === action);
    return availableAction?.reason || null;
  }

  /**
   * Get action severity from analysis
   */
  static getActionSeverity(analysis: ReportAnalysis | null | undefined, action: ActionType): string | null {
    const availableAction = analysis?.availableActions.find(a => a.action === action);
    return availableAction?.severity || null;
  }

  /**
   * Get report types that triggered an action
   */
  static getActionTriggerTypes(analysis: ReportAnalysis | null | undefined, action: ActionType): ReportType[] {
    const availableAction = analysis?.availableActions.find(a => a.action === action);
    return availableAction?.reportTypes || [];
  }
}