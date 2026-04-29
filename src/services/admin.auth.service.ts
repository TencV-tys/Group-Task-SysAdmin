// services/admin.auth.service.ts

const API_URL = import.meta.env.VITE_API_URL;

export interface AdminLoginCredentials {
  email: string;
  password: string;
}

export interface Admin {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt?: string;
}

export interface AdminLoginResponse {
  success: boolean;
  message: string;
  admin?: Admin;
  token?: string;
  remainingAttempts?: number;
  isLocked?: boolean;
  lockoutMinutes?: number;
}

class AdminAuthServiceClass {
  private static tokenKey = 'adminAccessToken';

  private static async getHeaders(withJsonContent: boolean = true, includeAuth: boolean = false): Promise<HeadersInit> {
    const headers: HeadersInit = {};
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    if (includeAuth) {
      const token = this.getAccessToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return headers;
  }

  static async login(data: AdminLoginCredentials): Promise<AdminLoginResponse> {
    try {
      const headers = await this.getHeaders(true, false);
      
      const response = await fetch(`${API_URL}/api/auth/admins/login`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      
      // Handle rate limiting (429 status code)
      if (response.status === 429 || result.remainingAttempts !== undefined) {
        return {
          success: false,
          message: result.message || 'Too many failed attempts',
          remainingAttempts: result.remainingAttempts,
          isLocked: result.isLocked,
          lockoutMinutes: result.lockoutMinutes
        };
      }
      
      // Store token when login is successful
      if (result.success && result.token) {
        localStorage.setItem(this.tokenKey, result.token);
        
        if (result.admin) {
          localStorage.setItem('adminData', JSON.stringify(result.admin));
        }
      }
      
      return result;
    } catch (error: unknown) {
      let errorMessage = "Cannot connect to the server";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  static async getCurrentAdmin(): Promise<Admin | null> {
    try {
      const cachedAdmin = localStorage.getItem('adminData');
      if (cachedAdmin) {
        try {
          const admin = JSON.parse(cachedAdmin);
          return admin;
        } catch (e) {
          console.error(e)
          // Invalid cache, ignore
        }
      }
      
      const token = this.getAccessToken();
      if (!token) {
        return null;
      }
      
      const headers = await this.getHeaders(true, true);
      
      const response = await fetch(`${API_URL}/api/auth/admins/me`, {
        method: "GET",
        credentials: 'include',
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          this.clearToken();
          return null;
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && result.admin) {
        localStorage.setItem('adminData', JSON.stringify(result.admin));
        return result.admin;
      }
      
      return null;
    } catch (error) {
      console.error("Error getting current admin:", error);
      return null;
    }
  }

  static async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const token = this.getAccessToken();
      const headers = await this.getHeaders(true, true);
      
      await fetch(`${API_URL}/api/auth/admins/logout`, {
        method: "POST",
        credentials: 'include',
        headers: {
          ...headers,
          'Authorization': `Bearer ${token}`
        }
      });
      
      this.clearToken();
      localStorage.removeItem('adminData');
      
      return {
        success: true,
        message: "Logged out successfully"
      };
    } catch (error: unknown) {
      this.clearToken();
      localStorage.removeItem('adminData');
      
      let errorMessage = "Cannot connect to the server";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  static getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.tokenKey);
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  static clearToken(): void {
    try {
      localStorage.removeItem(this.tokenKey);
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  static isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }
}

export const AdminAuthService = AdminAuthServiceClass;
export const getAdminAccessToken = (): string | null => {
  return AdminAuthService.getAccessToken();
};