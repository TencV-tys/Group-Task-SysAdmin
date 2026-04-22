// types/socket.types.ts
export type SocketEventData = Record<string, unknown> | unknown[] | string | number | boolean | null;
export type SocketCallback = (data: SocketEventData) => void;

export interface AdminSocketContextType {
  isConnected: boolean;
  subscribe: (event: string, callback: SocketCallback) => () => void;
  emit: (event: string, data?: SocketEventData) => void;
}