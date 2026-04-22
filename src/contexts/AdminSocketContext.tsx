// contexts/AdminSocketContext.tsx - FIXED (no TypeScript errors)

import React, { createContext, useContext, useEffect, useRef, useCallback, useState } from 'react';
import { adminSocket, connectAdminSocket } from '../services/adminSocket';

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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    if (initializedRef.current) {
      console.log('🔄 [SocketContext] Already initialized, skipping');
      return;
    }
    initializedRef.current = true;

    console.log('🔌 [SocketContext] Starting setup...');

    const setupSocket = async () => {
      try {
        console.log('🔌 [SocketContext] Calling connectAdminSocket...');
        await connectAdminSocket();
        console.log('✅ [SocketContext] connectAdminSocket completed');
        
        if (!mountedRef.current) return;

        // Set up event handlers
        const handleConnect = () => {
          console.log('🔌🔌🔌 [SocketContext] CONNECT event fired! 🔌🔌🔌');
          if (mountedRef.current) setIsConnected(true);
        };
        
        const handleDisconnect = () => {
          console.log('🔌 [SocketContext] DISCONNECT event fired');
          if (mountedRef.current) setIsConnected(false);
        };

        // Fix: Use any for error since EventCallback expects unknown[]
        const handleConnectError = (...args: unknown[]) => {
          console.error('❌ [SocketContext] Connection error event:', args[0]);
          if (mountedRef.current) setIsConnected(false);
        };

        adminSocket.on('connect', handleConnect);
        adminSocket.on('disconnect', handleDisconnect);
        adminSocket.on('connect_error', handleConnectError);

        // Listen for all events and forward to registered callbacks
        const handleAny = (event: string, ...args: unknown[]) => {
          console.log(`📡 [SocketContext] onAny caught event: "${event}"`, args[0]);
          
          const callbacks = listenersRef.current.get(event);
          if (callbacks && callbacks.size > 0) {
            console.log(`📡 [SocketContext] Found ${callbacks.size} callbacks for "${event}"`);
            const data = args.length > 0 ? args[0] : null;
            callbacks.forEach(callback => {
              try {
                callback(data as SocketEventData);
              } catch (err) {
                console.error(`[SocketContext] Error in callback for "${event}":`, err);
              }
            });
          }
        };

        // Use onAny if available, otherwise fallback
        if (typeof adminSocket.onAny === 'function') {
          adminSocket.onAny(handleAny);
        }

        // Check current connection status
        const currentConnected = adminSocket.isConnected;
        console.log(`🔌 [SocketContext] Current socket connected status: ${currentConnected}`);
        if (mountedRef.current && currentConnected) {
          console.log('✅ [SocketContext] Socket already connected, setting isConnected to true');
          setIsConnected(true);
        }
        
      } catch (error) {
        console.error('❌ [SocketContext] Failed to connect:', error);
        if (mountedRef.current) setIsConnected(false);
      }
    };

    setupSocket();
    
    return () => { 
      console.log('🧹 [SocketContext] Cleaning up');
      mountedRef.current = false;
    };
  }, []);

  const subscribe = useCallback((event: string, callback: SocketCallback): (() => void) => {
    console.log(`🎧 [SocketContext] Subscribing to event: "${event}"`);
    
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event)!.add(callback);

    return () => {
      console.log(`🔇 [SocketContext] Unsubscribing from event: "${event}"`);
      const callbacks = listenersRef.current.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) listenersRef.current.delete(event);
      }
    };
  }, []);

  const emit = useCallback((event: string, data?: SocketEventData): void => {
    if (adminSocket.isConnected) {
      console.log(`📤 [SocketContext] Emitting: "${event}"`, data);
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