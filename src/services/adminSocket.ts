// services/adminSocket.ts - FULLY UPDATED WITH CONSOLE LOGS

import { io, Socket } from 'socket.io-client';
import { getAdminAccessToken } from './admin.auth.service';

const API_URL = import.meta.env.VITE_API_URL;

type EventCallback = (...args: unknown[]) => void;

class AdminSocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, EventCallback[]> = new Map();
  private connectionPromise: Promise<void> | null = null;

  async connect(token?: string): Promise<void> {
    console.log('🔌 [AdminSocket] connect() called');
    
    if (this.socket?.connected) {
      console.log('✅ [AdminSocket] Already connected, socket ID:', this.socket.id);
      return;
    }
    
    if (this.connectionPromise) {
      console.log('⏳ [AdminSocket] Connection already in progress, waiting...');
      return this.connectionPromise;
    }

    this.connectionPromise = new Promise((resolve, reject) => {
      const setupConnection = async () => {
        try {
          const accessToken = token || await getAdminAccessToken();
          console.log('🔌 [AdminSocket] Token obtained:', accessToken ? 'YES' : 'NO');
          
          if (!accessToken) {
            console.error('❌ [AdminSocket] No admin token available');
            reject(new Error('No admin token'));
            return;
          }

          console.log(`🔌 [AdminSocket] Connecting to: ${API_URL}`);
          
          this.socket = io(API_URL, {
            auth: { token: accessToken },
            transports: ['websocket'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
          });

          const timeoutId = setTimeout(() => {
            if (!this.socket?.connected) {
              console.error('❌ [AdminSocket] Connection timeout after 10 seconds');
              this.connectionPromise = null;
              reject(new Error('Connection timeout'));
            }
          }, 10000);

          this.socket.on('connect', () => {
            console.log('✅✅✅ [AdminSocket] CONNECTED SUCCESSFULLY! ✅✅✅');
            console.log(`📡 [AdminSocket] Socket ID: ${this.socket?.id}`);
            console.log(`📡 [AdminSocket] Transport: ${this.socket?.io.engine.transport.name}`);
            clearTimeout(timeoutId);
            this.socket?.emit('admin:register');
            console.log('📤 [AdminSocket] Emitted admin:register');
            this.connectionPromise = null;
            resolve();
          });

          this.socket.on('connect_error', (error) => {
            console.error(`❌ [AdminSocket] Connection error: ${error.message}`);
            clearTimeout(timeoutId);
            this.connectionPromise = null;
            reject(error);
          });

          this.socket.on('disconnect', (reason) => {
            console.log(`🔌 [AdminSocket] Disconnected. Reason: ${reason}`);
          });

          this.socket.on('reconnect', (attemptNumber) => {
            console.log(`🔄 [AdminSocket] Reconnected after ${attemptNumber} attempts`);
          });

          // Log ALL incoming events
          this.socket.onAny((event: string, ...args: unknown[]) => {
            console.log(`📡📡📡 [AdminSocket] RAW EVENT RECEIVED: "${event}"`, args[0]);
            
            const callbacks = this.listeners.get(event);
            if (callbacks && callbacks.length > 0) {
              console.log(`📡 [AdminSocket] → Forwarding to ${callbacks.length} listener(s) for "${event}"`);
              callbacks.forEach(callback => {
                try {
                  callback(...args);
                } catch (err) {
                  console.error(`❌ [AdminSocket] Error in callback for "${event}":`, err);
                }
              });
            } else {
              console.log(`📡 [AdminSocket] → No listeners registered for "${event}"`);
            }
          });

        } catch (error) {
          console.error('❌ [AdminSocket] Setup error:', error);
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
      console.log(`📤 [AdminSocket] Emitting: "${event}"`, args[0]);
      this.socket.emit(event, ...args);
    } else {
      console.warn(`⚠️ [AdminSocket] Not connected, cannot emit: "${event}"`);
    }
  }

  disconnect(): void {
    console.log('🔌 [AdminSocket] Disconnecting...');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.connectionPromise = null;
    console.log('✅ [AdminSocket] Disconnected');
  }

  on(event: string, callback: EventCallback): void {
    console.log(`🎧 [AdminSocket] Registering listener for "${event}"`);
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
        const idx = callbacks.indexOf(callback);
        if (idx > -1) callbacks.splice(idx, 1);
      }
      if (this.socket) this.socket.off(event, callback);
    } else {
      this.listeners.delete(event);
      if (this.socket) this.socket.removeAllListeners(event);
    }
  }

  onAny(callback: (event: string, ...args: unknown[]) => void): void {
    if (this.socket) {
      this.socket.onAny(callback);
      console.log('🎧 [AdminSocket] Registered catch-all onAny handler');
    } else {
      console.warn('⚠️ [AdminSocket] onAny called before socket initialized');
    }
  }

  get isConnected(): boolean { 
    const connected = this.socket?.connected || false;
    console.log(`🔌 [AdminSocket] isConnected check: ${connected}`);
    return connected;
  }
  
  get socketId(): string | undefined { 
    return this.socket?.id; 
  }
}

export const adminSocket = new AdminSocketService();
export const connectAdminSocket = async (): Promise<void> => {
  console.log('🔌 [connectAdminSocket] Called');
  return adminSocket.connect();
};
export const disconnectAdminSocket = (): void => {
  console.log('🔌 [disconnectAdminSocket] Called');
  adminSocket.disconnect();
};
export const emitAdminEvent = (event: string, ...args: unknown[]): void => {
  console.log(`📤 [emitAdminEvent] Emitting: "${event}"`);
  adminSocket.emit(event, ...args);
};