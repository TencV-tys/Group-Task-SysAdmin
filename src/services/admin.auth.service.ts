// services/admin.auth.service.ts - FIXED to store token

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
      console.log("🔍 Admin login attempt:", data.email);
      
      const headers = await this.getHeaders(true, false);
      
      const response = await fetch(`${API_URL}/api/auth/admins/login`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: 'include'
      });

      const result = await response.json();
      console.log("🔍 Admin login response:", result);
      
      // ✅ STORE TOKEN when login is successful
      if (result.success && result.token) {
        localStorage.setItem(this.tokenKey, result.token);
        console.log('🔐 Admin token stored in localStorage');
        
        // Also store admin data
        if (result.admin) {
          localStorage.setItem('adminData', JSON.stringify(result.admin));
        }
      }
      
      return result;

    } catch (error: unknown) {
      console.error("Admin login error:", error);
      
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
      console.log("🔍 Getting current admin...");
      
      // ✅ First try to get from localStorage
      const cachedAdmin = localStorage.getItem('adminData');
      if (cachedAdmin) {
        try {
          const admin = JSON.parse(cachedAdmin);
          console.log("📦 Using cached admin data");
          return admin;
        } catch (e) {
          console.error(e)
          // Invalid cache, ignore
        }
      }
      
      const token = this.getAccessToken();
      if (!token) {
        console.log("❌ No admin token found");
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
          console.log("🔍 Not authenticated");
          this.clearToken();
          return null;
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      console.log("🔍 Get current admin response:", result);
      
      if (result.success && result.admin) {
        // Cache admin data
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
    
    // ✅ Use the token in the request
    const response = await fetch(`${API_URL}/api/auth/admins/logout`, {
      method: "POST",
      credentials: 'include',
      headers: {
        ...headers,
        'Authorization': `Bearer ${token}`
      }
    });

    // Clear stored tokens regardless of response
    this.clearToken();
    localStorage.removeItem('adminData');

    const result = await response.json();
    return result;

  } catch (error: unknown) {
    console.error("Admin logout error:", error);
    
    // Still clear tokens on error
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