// contexts/AdminSocketContext.tsx - CLEAN REAL-TIME VERSION

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { adminSocket, connectAdminSocket } from '../services/adminSocket';

// Types
type SocketEventData = Record<string, unknown> | unknown[] | string | number | boolean | null;
type SocketCallback = (data: SocketEventData) => void;

interface AdminSocketContextType {
  isConnected: boolean;
  subscribe: (event: string, callback: SocketCallback) => () => void;
  emit: (event: string, data?: SocketEventData) => void;
}

const AdminSocketContext = createContext<AdminSocketContextType | null>(null);

export const useAdminSocket = (): AdminSocketContextType => {
  const context = useContext(AdminSocketContext);
  if (!context) {
    throw new Error('useAdminSocket must be used within AdminSocketProvider');
  }
  return context;
};

interface AdminSocketProviderProps {
  children: React.ReactNode;
}

export const AdminSocketProvider: React.FC<AdminSocketProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef<Map<string, Set<SocketCallback>>>(new Map());
  const initializedRef = useRef(false);

  useEffect(() => {
    let mounted = true;
    if (initializedRef.current) return;
    initializedRef.current = true;

    const setupSocket = async () => {
      try {
        await connectAdminSocket();
        if (!mounted) return;

        adminSocket.on('connect', () => {
          console.log('🔌 [SocketContext] Connected');
          if (mounted) setIsConnected(true);
        });
        
        adminSocket.on('disconnect', () => {
          console.log('🔌 [SocketContext] Disconnected');
          if (mounted) setIsConnected(false);
        });

        // Single onAny handler for all events
        adminSocket.onAny((event: string, ...args: unknown[]) => {
          const callbacks = listenersRef.current.get(event);
          if (callbacks && callbacks.size > 0) {
            const data = args.length > 0 ? args[0] : null;
            callbacks.forEach(callback => {
              try {
                callback(data as SocketEventData);
              } catch (err) {
                console.error(`[SocketContext] Error in callback for event "${event}":`, err);
              }
            });
          }
        });

        if (mounted && adminSocket.isConnected) setIsConnected(true);
      } catch (error) {
        console.error('❌ [SocketContext] Failed to connect:', error);
      }
    };

    setupSocket();
    return () => { mounted = false; };
  }, []);

  const subscribe = useCallback((event: string, callback: SocketCallback): (() => void) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    return () => {
      const callbacks = listenersRef.current.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) listenersRef.current.delete(event);
      }
    };
  }, []);

  const emit = useCallback((event: string, data?: SocketEventData): void => {
    if (adminSocket.isConnected) {
      if (data !== undefined) {
        adminSocket.emit(event, data);
      } else {
        adminSocket.emit(event);
      }
    } else {
      console.warn(`[SocketContext] Not connected, cannot emit "${event}"`);
    }
  }, []);

  const value: AdminSocketContextType = { isConnected, subscribe, emit };

  return (
    <AdminSocketContext.Provider value={value}>
      {children}
    </AdminSocketContext.Provider>
  );
};