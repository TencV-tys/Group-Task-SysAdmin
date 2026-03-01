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
        credentials: 'include'
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

  static async logout(): Promise<{ success: boolean; message: string }> {
    try {
      const headers = await this.getHeaders();
      
      const response = await fetch(`${API_URL}/api/auth/admins/logout`, {
        method: "POST",
        headers,
        credentials: 'include'
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

  static async getCurrentAdmin(): Promise<Admin | null> {
    try {
      // You might want to add a /me endpoint
      return null;
    } catch {
      return null;
    }
  }
}

export const AdminAuthService = AdminAuthServiceClass;