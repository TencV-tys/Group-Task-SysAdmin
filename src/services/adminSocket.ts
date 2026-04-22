// services/adminSocket.ts - FIXED (adds onAny)

import { io, Socket } from 'socket.io-client';
import { getAdminAccessToken } from './admin.auth.service';

const API_URL = import.meta.env.VITE_API_URL;

type EventCallback = (...args: unknown[]) => void;

class AdminSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private connectionPromise: Promise<void> | null = null;

  async connect(token?: string): Promise<void> {
    if (this.socket?.connected) return;
    if (this.connectionPromise) return this.connectionPromise;

    this.connectionPromise = new Promise((resolve, reject) => {
      const setupConnection = async () => {
        try {
          const accessToken = token || await getAdminAccessToken();
          if (!accessToken) {
            reject(new Error('No admin token'));
            return;
          }

          this.socket = io(API_URL, {
            auth: { token: accessToken },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });

          const timeoutId = setTimeout(() => {
            if (!this.socket?.connected) {
              this.connectionPromise = null;
              reject(new Error('Connection timeout'));
            }
          }, 10000);

          this.socket.on('connect', () => {
            clearTimeout(timeoutId);
            this.socket?.emit('admin:register');
            this.connectionPromise = null;
            resolve();
          });

          this.socket.on('connect_error', (error) => {
            clearTimeout(timeoutId);
            this.connectionPromise = null;
            reject(error);
          });

          this.socket.on('disconnect', (reason) => {
            console.log('🔌 Admin socket disconnected:', reason);
          });

          // Keep per-event listeners working (used by useAdminFeedback hook)
          this.socket.onAny((event: string, ...args: unknown[]) => {
            const callbacks = this.listeners.get(event);
            if (callbacks) {
              callbacks.forEach(callback => callback(...args));
            }
          });

        } catch (error) {
          this.connectionPromise = null;
          reject(error);
        }
      };

      setupConnection();
    });

    return this.connectionPromise;
  }

  emit(event: string, ...args: unknown[]): void {
    if (this.socket?.connected) {
      this.socket.emit(event, ...args);
    } else {
      console.warn(`⚠️ [Socket] Not connected, cannot emit: ${event}`);
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
  }

  on(event: string, callback: EventCallback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event)!.push(callback);
    if (this.socket) this.socket.on(event, callback);
  }

  off(event: string, callback?: EventCallback): void {
    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const idx = callbacks.indexOf(callback);
        if (idx > -1) callbacks.splice(idx, 1);
      }
      if (this.socket) this.socket.off(event, callback);
    } else {
      this.listeners.delete(event);
      if (this.socket) this.socket.removeAllListeners(event);
    }
  }

  // FIX: used by AdminSocketContext to register a single catch-all handler
  onAny(callback: (event: string, ...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.onAny(callback);
    } else {
      console.warn('[Socket] onAny called before socket initialized');
    }
  }

  get isConnected(): boolean { return this.socket?.connected || false; }
  get socketId(): string | undefined { return this.socket?.id; }
}

export const adminSocket = new AdminSocketService();
export const connectAdminSocket = async (): Promise<void> => adminSocket.connect();
export const disconnectAdminSocket = (): void => adminSocket.disconnect();
export const emitAdminEvent = (event: string, ...args: unknown[]): void => adminSocket.emit(event, ...args); 