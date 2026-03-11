// services/admin.groups.service.ts
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

export interface GroupSettings {
  allowMemberInvites?: boolean;
  defaultMemberRole?: 'MEMBER' | 'ADMIN';
  requireTaskApproval?: boolean;
  allowSwapRequests?: boolean;
  maxMembers?: number;
  isPrivate?: boolean;
  taskReminders?: {
    enabled: boolean;
    hoursBefore: number;
  };
  rotationSettings?: {
    autoRotate: boolean;
    rotationDay: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
    rotationTime: string;
  };
  [key: string]: unknown;
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
  settings?: GroupSettings;
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
  stats?: {
    activeMembers: number;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
  };
}

export interface GroupMember {
  id: string;
  userId: string;
  groupRole: string;
  joinedAt: string;
  rotationOrder: number | null;
  isActive: boolean;
  cumulativePoints: number;
  user: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl: string | null;
    roleStatus: string;
    createdAt: string;
    lastLoginAt: string | null;
    _count?: {
      assignments: number;
    };
  };
  stats: {
    completedTasks: number;
    totalTasks: number;
    completionRate: number;
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

export interface GroupMembersResponse {
  success: boolean;
  message: string;
  members?: GroupMember[];
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    hasMore: boolean;
  };
}

export interface DeleteGroupResponse {
  success: boolean;
  message: string;
}

export interface BulkDeleteResponse {
  success: boolean;
  message: string;
  results?: Array<{
    groupId: string;
    success: boolean;
    message: string;
  }>;
}

export interface GroupStatisticsResponse {
  success: boolean;
  message: string;
  statistics?: {
    overview: {
      total: number;
      active: number;
      recent: number;
      withReports: number;
    };
    sizeDistribution: Array<{
      size_range: string;
      count: number;
    }>;
    topGroups: {
      byMembers: Array<{
        id: string;
        name: string;
        memberCount: number;
      }>;
      byTasks: Array<{
        id: string;
        name: string;
        taskCount: number;
      }>;
    };
  };
}

export interface GroupsExportData {
  success: boolean;
  message: string;
  groups?: Group[];
}

export interface UpdateGroupData {
  name?: string;
  description?: string | null;
  avatarUrl?: string | null;
  settings?: GroupSettings;
}

export interface ActivityLog {
  id: string;
  action: string;
  userId: string;
  groupId: string;
  details?: Record<string, unknown>;
  createdAt: string;
  user?: {
    id: string;
    fullName: string;
    email: string;
    avatarUrl?: string | null;
  };
}

export interface GroupActivityResponse {
  success: boolean;
  message: string;
  activities?: ActivityLog[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface GroupTasksResponse {
  success: boolean;
  message: string;
  tasks?: Array<{
    id: string;
    title: string;
    description: string | null;
    points: number;
    executionFrequency: string;
    createdAt: string;
    timeSlots?: Array<{
      id: string;
      startTime: string;
      endTime: string;
      label?: string;
    }>;
    _count?: {
      assignments: number;
    };
  }>;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export interface GroupReportsResponse {
  success: boolean;
  message: string;
  reports?: Array<{
    id: string;
    type: string;
    description: string;
    status: string;
    createdAt: string;
    reporter: {
      id: string;
      fullName: string;
      email: string;
    };
  }>;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ========== SERVICE CLASS ==========

export class AdminGroupsService {
  // ========== BASIC CRUD ==========
  
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
   * Get group by ID with full details
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
   * Update group settings
   */
  static async updateGroup(
    groupId: string, 
    data: UpdateGroupData
  ): Promise<GroupResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  // ========== GROUP STATISTICS ==========
  
  /**
   * Get group statistics
   */
  static async getGroupStatistics(filters?: { 
    startDate?: string; 
    endDate?: string;
    minMembers?: number;
    maxMembers?: number;
  }): Promise<GroupStatisticsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.minMembers) params.append('minMembers', filters.minMembers.toString());
        if (filters.maxMembers) params.append('maxMembers', filters.maxMembers.toString());
      }
      
      const queryString = params.toString();
      const url = `${API_URL}/api/admin/groups/statistics${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  // ========== GROUP MEMBERS MANAGEMENT ==========
  
  /**
   * Get all members of a group
   */
  static async getGroupMembers(
    groupId: string, 
    filters?: {
      role?: string;
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<GroupMembersResponse> {
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
      const url = `${API_URL}/api/admin/groups/${groupId}/members${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Remove a member from a group
   */
  static async removeMember(
    groupId: string, 
    memberId: string, 
    reason?: string
  ): Promise<DeleteGroupResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Update member role in group
   */
  static async updateMemberRole(
    groupId: string,
    memberId: string,
    role: 'MEMBER' | 'ADMIN'
  ): Promise<DeleteGroupResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/members/${memberId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ groupRole: role })
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  // ========== GROUP TASKS ==========
  
  /**
   * Get all tasks in a group
   */
  static async getGroupTasks(
    groupId: string,
    filters?: {
      page?: number;
      limit?: number;
      isDeleted?: boolean;
    }
  ): Promise<GroupTasksResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.isDeleted !== undefined) params.append('isDeleted', filters.isDeleted.toString());
      }
      
      const queryString = params.toString();
      const url = `${API_URL}/api/admin/groups/${groupId}/tasks${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  // ========== GROUP REPORTS ==========
  
  /**
   * Get all reports for a group
   */
  static async getGroupReports(
    groupId: string,
    filters?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<GroupReportsResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.status) params.append('status', filters.status);
        if (filters.page) params.append('page', filters.page.toString());
        if (filters.limit) params.append('limit', filters.limit.toString());
      }
      
      const queryString = params.toString();
      const url = `${API_URL}/api/admin/groups/${groupId}/reports${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  // ========== GROUP ACTIVITY ==========
  
  /**
   * Get group activity logs
   */
  static async getGroupActivity(
    groupId: string,
    filters?: {
      startDate?: string;
      endDate?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<GroupActivityResponse> {
    try {
      const params = new URLSearchParams();
      
      if (filters) {
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.limit) params.append('limit', filters.limit.toString());
        if (filters.offset) params.append('offset', filters.offset.toString());
      }
      
      const queryString = params.toString();
      const url = `${API_URL}/api/admin/groups/${groupId}/activity${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { 
        success: false, 
        message: 'Network error' 
      };
    }
  }

  // ========== BULK OPERATIONS ==========
  
  /**
   * Bulk delete multiple groups
   */
  static async bulkDeleteGroups(
    groupIds: string[],
    options?: { hardDelete?: boolean; reason?: string }
  ): Promise<BulkDeleteResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/bulk-delete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupIds,
          hardDelete: options?.hardDelete,
          reason: options?.reason
        })
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  // ========== EXPORT ==========
  
  /**
   * Export groups data
   */
  static async exportGroups(
    format?: 'json' | 'csv', 
    filters?: GroupFilters
  ): Promise<string | GroupsExportData> {
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
      const url = `${API_URL}/api/admin/groups/export${queryString ? `?${queryString}` : ''}`;
      
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

  // ========== ROTATION MANAGEMENT ==========
  
  /**
   * Trigger rotation for a group
   */
  static async triggerRotation(
    groupId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/rotate`, {
        method: 'POST',
        credentials: 'include'
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Update rotation settings
   */
  static async updateRotationSettings(
    groupId: string,
    settings: {
      currentRotationWeek?: number;
      lastRotationUpdate?: string;
    }
  ): Promise<GroupResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/groups/${groupId}/rotation`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });
      return await response.json();
    } catch {
      return { success: false, message: 'Network error' };
    }
  }
}