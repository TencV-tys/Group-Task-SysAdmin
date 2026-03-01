const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

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
}

class AdminAuthServiceClass {
  private static async getHeaders(withJsonContent: boolean = true): Promise<HeadersInit> {
    const headers: HeadersInit = {};
    
    if (withJsonContent) {
      headers['Content-Type'] = 'application/json';
    }
    
    return headers;
  }

  static async login(data: AdminLoginCredentials): Promise<AdminLoginResponse> {
    try {
      console.log("🔍 Admin login attempt:", data.email);
      
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/api/auth/admins/login`, {
        method: "POST",
        headers,
        body: JSON.stringify(data),
        credentials: 'include' // Important for cookies
      });

      const result = await response.json();
      console.log("🔍 Admin login response:", result);
      
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
      
      const response = await fetch(`${API_URL}/api/auth/admins/me`, {
        method: "GET",
        credentials: 'include', // Send cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log("🔍 Not authenticated");
          return null; 
        }
        throw new Error(`HTTP error: ${response.status}`);
      }

      const result = await response.json();
      console.log("🔍 Get current admin response:", result);
      
      return result.success ? result.admin : null;

    } catch (error) {
      console.error("Error getting current admin:", error);
      return null;
    }
  }

  static async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`${API_URL}/api/auth/admins/logout`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result;

    } catch (error: unknown) {
      console.error("Admin logout error:", error);
      
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
}

export const AdminAuthService = AdminAuthServiceClass;