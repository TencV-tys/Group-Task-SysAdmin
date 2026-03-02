const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface FeedbackUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
}

export interface Feedback {
  id: string;
  type: string;
  message: string;
  status: string;
  category?: string | null;
  createdAt: string;
  updatedAt: string;
  user: FeedbackUser;
}

export interface FeedbackDetails extends Feedback {
  user: FeedbackUser & {
    role: string;
    createdAt: string;
  };
}

export interface FeedbackFilters {
  status?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface FeedbackStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  byType: Record<string, number>;
}

export interface FeedbackResponse {
  success: boolean;
  message: string;
  data?: {
    feedback: Feedback[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export interface FeedbackDetailsResponse {
  success: boolean;
  message: string;
  data?: FeedbackDetails;
}

export interface FeedbackStatsResponse {
  success: boolean;
  message: string;
  data?: FeedbackStats;
}

class AdminFeedbackServiceClass {
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {};
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  // ========== GET ALL FEEDBACK ==========
  static async getFeedback(filters?: FeedbackFilters): Promise<FeedbackResponse> {
    try {
      const params = new URLSearchParams();
      if (filters?.status) params.append('status', filters.status);
      if (filters?.type) params.append('type', filters.type);
      if (filters?.search) params.append('search', filters.search);
      if (filters?.page) params.append('page', filters.page.toString());
      if (filters?.limit) params.append('limit', filters.limit.toString());
      if (filters?.sortBy) params.append('sortBy', filters.sortBy);
      if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder);

      const url = `${API_URL}/api/admin/feedback${params.toString() ? `?${params}` : ''}`;
      
      console.log('📥 Fetching feedback:', url);
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Feedback response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching feedback:', error);
      return {
        success: false,
        message: 'Failed to fetch feedback'
      };
    }
  }

  // ========== GET FEEDBACK STATS ==========
  static async getFeedbackStats(): Promise<FeedbackStatsResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/feedback/stats`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Feedback stats:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching feedback stats:', error);
      return {
        success: false,
        message: 'Failed to fetch feedback stats'
      };
    }
  }

  // ========== GET SINGLE FEEDBACK ==========
  static async getFeedbackById(feedbackId: string): Promise<FeedbackDetailsResponse> {
    try {
      console.log('📥 Fetching feedback details:', feedbackId);
      
      const response = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}`, {
        method: 'GET',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Feedback details:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error fetching feedback details:', error);
      return {
        success: false,
        message: 'Failed to fetch feedback details'
      };
    }
  }

  // ========== UPDATE FEEDBACK STATUS ==========
  static async updateFeedbackStatus(
    feedbackId: string, 
    status: string
  ): Promise<FeedbackDetailsResponse> {
    try {
      const response = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: await this.getHeaders(),
        body: JSON.stringify({ status }) // Removed adminNotes
      });

      const result = await response.json();
      console.log('📦 Update status response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error updating feedback status:', error);
      return {
        success: false,
        message: 'Failed to update feedback status'
      };
    }
  }

  // ========== DELETE FEEDBACK ==========
  static async deleteFeedback(feedbackId: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/api/admin/feedback/${feedbackId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: await this.getHeaders()
      });

      const result = await response.json();
      console.log('📦 Delete response:', result);
      
      return result;

    } catch (error) {
      console.error('❌ Error deleting feedback:', error);
      return {
        success: false,
        message: 'Failed to delete feedback'
      };
    }
  }
}

export const AdminFeedbackService = AdminFeedbackServiceClass;