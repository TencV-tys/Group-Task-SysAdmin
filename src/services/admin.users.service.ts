const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface User {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  gender: string | null;
  role: string;
  roleStatus: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  groupsCount: number;
  tasksCompleted: number;
}

export interface UserDetails extends User {
  groups: Array<{
    group: {
      id: string;
      name: string;
      avatarUrl: string | null;
    };
    groupRole: string;
    joinedAt: string;
  }>;
  assignments: Array<{
    id: string;
    task: {
      title: string;
      points: number;
      group: {
        name: string;
      };
    };
    completedAt: string;
    points: number;
  }>;
  stats: {
    groupsCount: number;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalPoints: number;
  };
}

export interface UserFilters {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UsersResponse {
  success: boolean;
  message: string;
  data?: {
    users: User[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface UserDetailsResponse {
  success: boolean;
  message: string;
  data?: UserDetails;
}

class AdminUsersServiceClass {
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {};
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // ========== GET ALL USERS ==========
  static async getUsers(filters?: UserFilters): Promise<UsersResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.search) params.append('search', filters.search);
      if (filters?.role) params.append('role', filters.role);
      if (filters?.status) params.append('status', filters.status);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_URL}/api/admin/users${params.toString() ? `?${params}` : ''}`;
      
      console.log('📥 Fetching users:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Users response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching users:', error);
      return {
        success: false,
        message: 'Failed to fetch users'
      };
    }
  }

  // ========== GET SINGLE USER DETAILS ==========
  static async getUserById(userId: string): Promise<UserDetailsResponse> {
    try {
      console.log('📥 Fetching user details:', userId);
      
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 User details response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching user details:', error);
      return {
        success: false,
        message: 'Failed to fetch user details'
      };
    }
  }
}

export const AdminUsersService = AdminUsersServiceClass;