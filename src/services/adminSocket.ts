// services/adminSocket.ts - COMPLETE FIXED VERSION (no async executor)

import { io, Socket } from 'socket.io-client';
import { getAdminAccessToken } from './admin.auth.service';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Define a proper callback type
type EventCallback = (...args: unknown[]) => void;

class AdminSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private connectionPromise: Promise<void> | null = null;

  async connect(token?: string): Promise<void> {
    if (this.socket?.connected) {
      console.log('✅ Admin socket already connected');
      return;
    }

    // If already connecting, return existing promise
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Create promise without async executor
    this.connectionPromise = new Promise((resolve, reject) => {
      // Get token outside the promise executor to avoid async issues
      const setupConnection = async () => {
        try {
          const accessToken = token || await getAdminAccessToken();
          
          if (!accessToken) {
            console.log('❌ No admin token found, cannot connect socket');
            reject(new Error('No admin token'));
            return;
          }

          console.log('🔌 Connecting admin socket...');

          this.socket = io(API_URL, {
            auth: { token: accessToken },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });

          this.socket.on('connect', () => {
            console.log('✅ Admin socket connected:', this.socket?.id);
            this.socket?.emit('admin:register');
            this.connectionPromise = null;
            resolve();
          });

          this.socket.on('connect_error', (error) => {
            console.error('❌ Admin socket connection error:', error.message);
            this.connectionPromise = null;
            reject(error);
          });

          this.socket.on('disconnect', (reason) => {
            console.log('🔌 Admin socket disconnected:', reason);
          });

          // Listen for all events dynamically
          this.socket.onAny((event: string, ...args: unknown[]) => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
              callbacks.forEach(callback => callback(...args));
            }
          });

          // Set timeout for connection
          const timeoutId = setTimeout(() => {
            if (!this.socket?.connected) {
              this.connectionPromise = null;
              reject(new Error('Connection timeout'));
            }
          }, 10000);

          // Clear timeout on cleanup
          this.socket?.on('connect', () => clearTimeout(timeoutId));
          this.socket?.on('connect_error', () => clearTimeout(timeoutId));
          
        } catch (error) {
          this.connectionPromise = null;
          reject(error);
        }
      };

      setupConnection();
    });

    return this.connectionPromise;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
    
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
      if (this.socket) {
        this.socket.off(event, callback);
      }
    } else {
      this.listeners.delete(event);
      if (this.socket) {
        this.socket.removeAllListeners(event);
      }
    }
  }

  get isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

export const adminSocket = new AdminSocketService();

// Helper function to connect admin socket
export const connectAdminSocket = async (): Promise<void> => {
  return adminSocket.connect();
};